const pool = require('../config/db');
const { serverError } = require('../utils/apiResponse');
const { listSelectableCodes, codeError } = require('../services/payrollCodes');

const readBody = (body) => {
    const name = String(body?.name || '').trim();

    if (!name) {
        return { error: 'A jogcím megnevezése kötelező.' };
    }

    if (name.length > 50) {
        return { error: 'A megnevezés legfeljebb 50 karakter lehet.' };
    }

    const payrollCodeId = Number(body?.payrollCodeId) || null;

    const sort = Number(body?.sort);

    if (!Number.isInteger(sort) || sort < 0) {
        return { error: 'A sorrend csak nemnegatív egész szám lehet.' };
    }

    const scheduleIds = Array.isArray(body?.workScheduleIds)
        ? [...new Set(body.workScheduleIds.map(Number).filter(Boolean))]
        : [];

    if (scheduleIds.length === 0) {
        return {
            error: 'Legalább egy munkarendet meg kell jelölni, '
                + 'különben a jogcímet senki nem tudná igénybe venni.'
        };
    }

    return {
        payrollCodeId,
        values: [
            name,
            payrollCodeId,
            body?.isPaid ? 1 : 0,
            body?.isOpenEnded ? 1 : 0,
            body?.needsApproval === false ? 0 : 1,
            body?.status ? 1 : 0,
            sort
        ],
        scheduleIds
    };
};

const list = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT a.absence_id, a.absence_name,
                    a.absence_payroll_code_id, pc.payroll_code,
                    a.absence_is_paid, a.absence_is_open_ended,
                    a.absence_needs_approval,
                    a.absence_status, a.absence_sort
             FROM Absences a
             LEFT JOIN PayrollCodes pc
                    ON pc.payroll_code_id = a.absence_payroll_code_id
             ORDER BY a.absence_sort, a.absence_name`
        );

        const [links] = await pool.execute(
            `SELECT aws.absence_id, aws.work_schedule_id, w.work_schedule_name
             FROM AbsenceWorkSchedules aws
             JOIN WorkSchedules w ON w.work_schedule_id = aws.work_schedule_id
             ORDER BY w.work_schedule_name`
        );

        const [schedules] = await pool.execute(
            `SELECT work_schedule_id, work_schedule_name
             FROM WorkSchedules
             ORDER BY work_schedule_name`
        );

        const absences = rows.map((row) => ({
            id: row.absence_id,
            name: row.absence_name,
            payrollCodeId: row.absence_payroll_code_id,
            payrollCode: row.payroll_code,
            isPaid: Boolean(row.absence_is_paid),
            isOpenEnded: Boolean(row.absence_is_open_ended),
            needsApproval: Boolean(row.absence_needs_approval),
            status: Boolean(row.absence_status),
            sort: row.absence_sort,
            workScheduleIds: links
                .filter((link) => link.absence_id === row.absence_id)
                .map((link) => link.work_schedule_id),
            workScheduleNames: links
                .filter((link) => link.absence_id === row.absence_id)
                .map((link) => link.work_schedule_name)
        }));

        return res.status(200).json({
            absences,
            payrollCodes: await listSelectableCodes(),
            workSchedules: schedules.map((row) => ({
                id: row.work_schedule_id,
                name: row.work_schedule_name
            }))
        });
    } catch (error) {
        return serverError(res, 'Jogcím lekérdezési hiba', error);
    }
};

const saveSchedules = async (connection, absenceId, scheduleIds) => {
    await connection.execute(
        `DELETE FROM AbsenceWorkSchedules WHERE absence_id = ?`,
        [absenceId]
    );

    for (const scheduleId of scheduleIds) {
        await connection.execute(
            `INSERT INTO AbsenceWorkSchedules (absence_id, work_schedule_id)
             VALUES (?, ?)`,
            [absenceId, scheduleId]
        );
    }
};

const create = async (req, res) => {
    const parsed = readBody(req.body);

    if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
    }

    const payrollError = await codeError(parsed.payrollCodeId);

    if (payrollError) {
        return res.status(409).json({ message: payrollError });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO Absences (
                absence_name, absence_payroll_code_id, absence_is_paid,
                absence_is_open_ended, absence_needs_approval,
                absence_status, absence_sort
             ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            parsed.values
        );

        await saveSchedules(connection, result.insertId, parsed.scheduleIds);
        await connection.commit();

        return res.status(201).json({
            message: 'A távolléti jogcím létrehozásra került.',
            id: result.insertId
        });
    } catch (error) {
        await connection.rollback();

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Ilyen nevű jogcím már létezik.' });
        }

        return serverError(res, 'Jogcím létrehozási hiba', error);
    } finally {
        connection.release();
    }
};

const update = async (req, res) => {
    const absenceId = Number(req.params.id);

    if (!absenceId) {
        return res.status(400).json({ message: 'Érvénytelen jogcím-azonosító.' });
    }

    const parsed = readBody(req.body);

    if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
    }

    const [current] = await pool.execute(
        `SELECT absence_payroll_code_id FROM Absences WHERE absence_id = ?`,
        [absenceId]
    );

    const keepCodeId = current.length > 0
        ? current[0].absence_payroll_code_id
        : null;

    const payrollError = await codeError(parsed.payrollCodeId, keepCodeId);

    if (payrollError) {
        return res.status(409).json({ message: payrollError });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `UPDATE Absences SET
                absence_name = ?, absence_payroll_code_id = ?, absence_is_paid = ?,
                absence_is_open_ended = ?, absence_needs_approval = ?,
                absence_status = ?, absence_sort = ?
             WHERE absence_id = ?`,
            [...parsed.values, absenceId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'A jogcím nem található.' });
        }

        await saveSchedules(connection, absenceId, parsed.scheduleIds);
        await connection.commit();

        return res.status(200).json({ message: 'A jogcím módosításra került.' });
    } catch (error) {
        await connection.rollback();

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Ilyen nevű jogcím már létezik.' });
        }

        return serverError(res, 'Jogcím módosítási hiba', error);
    } finally {
        connection.release();
    }
};

const remove = async (req, res) => {
    const absenceId = Number(req.params.id);

    if (!absenceId) {
        return res.status(400).json({ message: 'Érvénytelen jogcím-azonosító.' });
    }

    try {
        const [requests] = await pool.execute(
            `SELECT COUNT(*) AS db FROM Requests WHERE request_absence_id = ?`,
            [absenceId]
        );

        if (requests[0].db > 0) {
            return res.status(409).json({
                message: `A jogcím nem törölhető, mert ${requests[0].db} kérelem `
                    + 'hivatkozik rá. Ilyenkor az Inaktív állapot a helyes '
                    + 'megoldás: a jogcím eltűnik a választható listákból, de a '
                    + 'korábbi kérelmek értelmezhetők maradnak.'
            });
        }

        const [result] = await pool.execute(
            `DELETE FROM Absences WHERE absence_id = ?`,
            [absenceId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'A jogcím nem található.' });
        }

        return res.status(200).json({ message: 'A jogcím törlésre került.' });
    } catch (error) {
        return serverError(res, 'Jogcím törlési hiba', error);
    }
};

module.exports = { list, create, update, remove };