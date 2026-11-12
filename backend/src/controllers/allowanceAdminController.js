const pool = require('../config/db');
const { invalidId, serverError } = require('../utils/apiResponse');
const { listSelectableCodes, codeError } = require('../services/payrollCodes');

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const toSqlTime = (value) => (value.length === 5 ? `${value}:00` : value);

const readBody = (body) => {
    const name = String(body?.name || '').trim();

    if (!name) {
        return { error: 'A pótlék megnevezése kötelező.' };
    }

    if (name.length > 50) {
        return { error: 'A megnevezés legfeljebb 50 karakter lehet.' };
    }

    const percent = Number(body?.percent);

    if (!Number.isFinite(percent) || percent <= 0) {
        return { error: 'A pótlék százaléka csak pozitív szám lehet.' };
    }

    const startHour = String(body?.startHour || '').trim();
    const endHour = String(body?.endHour || '').trim();

    if (!TIME_PATTERN.test(startHour) || !TIME_PATTERN.test(endHour)) {
        return { error: 'Az idősáv kezdetét és végét óra:perc alakban kell megadni.' };
    }

    const payrollCodeId = Number(body?.payrollCodeId) || null;

    const scheduleIds = Array.isArray(body?.workScheduleIds)
        ? [...new Set(body.workScheduleIds.map(Number).filter(Boolean))]
        : [];

    if (scheduleIds.length === 0) {
        return {
            error: 'Legalább egy munkarendet meg kell jelölni, '
                + 'különben a pótlék senkire nem vonatkozna.'
        };
    }

    return {
        payrollCodeId,
        values: [name, payrollCodeId, percent, toSqlTime(startHour), toSqlTime(endHour)],
        scheduleIds
    };
};

const list = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT a.allowance_id, a.allowance_name, a.allowance_code,
                    a.allowance_payroll_code_id, pc.payroll_code,
                    a.allowance_percent,
                    a.allowance_start_hour, a.allowance_end_hour
             FROM Allowances a
             LEFT JOIN PayrollCodes pc
                    ON pc.payroll_code_id = a.allowance_payroll_code_id
             ORDER BY a.allowance_percent, a.allowance_name`
        );

        const [links] = await pool.execute(
            `SELECT wsa.allowance_id, wsa.work_schedule_id, w.work_schedule_name
             FROM WorkScheduleAllowances wsa
             JOIN WorkSchedules w ON w.work_schedule_id = wsa.work_schedule_id
             ORDER BY w.work_schedule_name`
        );

        const [schedules] = await pool.execute(
            `SELECT work_schedule_id, work_schedule_name
             FROM WorkSchedules
             ORDER BY work_schedule_name`
        );

        const allowances = rows.map((row) => ({
            id: row.allowance_id,
            name: row.allowance_name,
            code: row.allowance_code,
            payrollCodeId: row.allowance_payroll_code_id,
            payrollCode: row.payroll_code,
            percent: Number(row.allowance_percent),
            startHour: row.allowance_start_hour,
            endHour: row.allowance_end_hour,
            workScheduleIds: links
                .filter((link) => link.allowance_id === row.allowance_id)
                .map((link) => link.work_schedule_id),
            workScheduleNames: links
                .filter((link) => link.allowance_id === row.allowance_id)
                .map((link) => link.work_schedule_name)
        }));

        return res.status(200).json({
            allowances,
            payrollCodes: await listSelectableCodes(),
            workSchedules: schedules.map((row) => ({
                id: row.work_schedule_id,
                name: row.work_schedule_name
            }))
        });
    } catch (error) {
        return serverError(res, 'Pótlék lekérdezési hiba', error);
    }
};

const saveSchedules = async (connection, allowanceId, scheduleIds) => {
    await connection.execute(
        `DELETE FROM WorkScheduleAllowances WHERE allowance_id = ?`,
        [allowanceId]
    );

    for (const scheduleId of scheduleIds) {
        await connection.execute(
            `INSERT INTO WorkScheduleAllowances (work_schedule_id, allowance_id)
             VALUES (?, ?)`,
            [scheduleId, allowanceId]
        );
    }
};

const update = async (req, res) => {
    const allowanceId = Number(req.params.id);

    if (!allowanceId) {
        return invalidId(res);
    }

    const parsed = readBody(req.body);

    if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
    }

    const [current] = await pool.execute(
        `SELECT allowance_payroll_code_id FROM Allowances WHERE allowance_id = ?`,
        [allowanceId]
    );

    if (current.length === 0) {
        return res.status(404).json({ message: 'A pótlék nem található.' });
    }

    const payrollError = await codeError(
        parsed.payrollCodeId, current[0].allowance_payroll_code_id
    );

    if (payrollError) {
        return res.status(409).json({ message: payrollError });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await connection.execute(
            `UPDATE Allowances SET
                allowance_name = ?, allowance_payroll_code_id = ?,
                allowance_percent = ?,
                allowance_start_hour = ?, allowance_end_hour = ?
             WHERE allowance_id = ?`,
            [...parsed.values, allowanceId]
        );

        await saveSchedules(connection, allowanceId, parsed.scheduleIds);
        await connection.commit();

        return res.status(200).json({ message: 'A pótlék módosításra került.' });
    } catch (error) {
        await connection.rollback();
        return serverError(res, 'Pótlék módosítási hiba', error);
    } finally {
        connection.release();
    }
};

module.exports = { list, update };
