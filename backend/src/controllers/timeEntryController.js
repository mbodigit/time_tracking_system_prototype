const pool = require('../config/db');
const { canAccessEmployee, getAccessibleEmployeeIds } = require('../services/employeeScope');
const { calculateAllowances } = require('../services/allowanceCalculator');
const { buildMonthlyReport } = require('../services/monthlyReport');
const { DAY_TYPE_MAP, toSqlDateTime, daysSince, addDays, toDate } = require('../services/dateHelpers');
const { loadRotationSlots, resolveRotation } = require('../services/shiftRotation');

const MAX_DAILY_MINUTES = 12 * 60;
const BACKDATE_LIMIT_DAYS = 3;
const BREAK_EARLIEST_MINUTES = 3 * 60;
const BREAK_LATEST_MINUTES = 6 * 60;

const breakTimingError = (workStart, breakStart) => {
    const offset = Math.round(
        (toDate(breakStart).getTime() - toDate(workStart).getTime()) / (1000 * 60)
    );

    if (offset < BREAK_EARLIEST_MINUTES || offset > BREAK_LATEST_MINUTES) {
        return 'A munkaközi szünetet legalább három, legfeljebb hat óra '
            + 'munkavégzést követően kell kiadni.';
    }

    return null;
};

const UPDATABLE_FIELDS = {
    workStart: 'wtt_working_start',
    workEnd: 'wtt_working_end',
    breakStart: 'wtt_brk_start',
    breakEnd: 'wtt_brk_end',
    scheduleStart: 'wtt_schedule_start',
    scheduleEnd: 'wtt_schedule_end'
};



const create = async (req, res) => {
    const {
        employeeId,
        workingDate,
        workStart,
        workEnd,
        breakStart,
        breakEnd,
        scheduleStart,
        scheduleEnd,
        note
    } = req.body || {};

    if (!workingDate || !workStart || !workEnd) {
        return res.status(400).json({message: 'A munkanap, a munkavégzés kezdete és vége kötelező.'});
    }

    const targetEmployeeId = employeeId || req.user.employeeId;
    const isSelf = targetEmployeeId === req.user.employeeId;

    const start = new Date(workStart);
    const end = new Date(workEnd);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Érvénytelen időpont formátum.' });
    }

    if (end <= start) {
        return res.status(400).json({message: 'A munkavégzés vége nem lehet korábbi a kezdeténél.'});
    }

    const minutes = Math.round((end - start) / (1000 * 60));

    if (minutes > MAX_DAILY_MINUTES) {
        return res.status(400).json({message: 'Egy munkanapra legfeljebb 12 óra munkaidő rögzíthető.'});
    }

    if (breakStart) {
        const breakError = breakTimingError(workStart, breakStart);

        if (breakError) {
            return res.status(400).json({ message: breakError });
        }
    }

    if (req.user.role === 'Dolgozó' && (scheduleStart || scheduleEnd)) {
        return res.status(403).json({
            message: 'A beosztás szerinti munkaidőt a vezető határozza meg.'
        });
    }

    const daysPassed = daysSince(workingDate);

    if (daysPassed < 0) {
        return res.status(400).json({message: 'Jövőbeli napra munkaidő nem rögzíthető.'});
    }

    if (req.user.role === 'Dolgozó' && daysPassed > 0) {
        return res.status(403).json({message: 'A saját munkaidő csak a tárgynapon rögzíthető.'});
    }

    if (req.user.role !== 'HR-Bér' && daysPassed > BACKDATE_LIMIT_DAYS) {
        return res.status(403).json({message: 'Visszamenőleges rögzítésre legfeljebb három napig van lehetőség.'});
    }

    try {
        if (!isSelf) {
            const hasAccess = await canAccessEmployee(
                req.user.userId, req.user.employeeId, targetEmployeeId, req.user.role
            );

            if (!hasAccess) {
                return res.status(403).json({message: 'Ehhez a dolgozóhoz nincs hozzáférése.'});
            }
        }

        const [schedule] = await pool.execute(
            `SELECT
                w.work_schedule_name
             FROM Employees e
             JOIN EmployeeSettings s ON s.employee_id = e.employee_id
             JOIN WorkSchedules w ON w.work_schedule_id = s.employee_setting_work_schedule_id
             WHERE e.employee_id = ?`,
            [targetEmployeeId]
        );

        if (schedule.length > 0 && schedule[0].work_schedule_name === 'Kötetlen') {
            return res.status(409).json({
                message: 'Kötetlen munkarendben napi munkaidő nem rögzíthető.'
            });
        }

        const [covered] = await pool.execute(
            `SELECT a.absence_name
             FROM Requests r
             JOIN Absences a ON a.absence_id = r.request_absence_id
             WHERE r.request_employee_id = ?
               AND r.request_status = 'Jóváhagyva'
               AND a.absence_rec_type = 0
               AND ? BETWEEN r.request_start_date AND r.request_end_date
             LIMIT 1`,
            [targetEmployeeId, workingDate]
        );

        if (covered.length > 0) {
            return res.status(409).json({
                message: 'A napot jóváhagyott távolléti jogcím fedi '
                    + `(${covered[0].absence_name}), ezért munkaidő nem rögzíthető.`
            });
        }

        const [existing] = await pool.execute(
            `SELECT
                wtt_id 
             FROM WorkingTimeTracking
             WHERE wtt_employee_id = ? AND wtt_working_date = ?
             LIMIT 1`,
            [targetEmployeeId, workingDate]
        );

        if (existing.length > 0) {
            return res.status(409).json({message: 'Erre a napra már van rögzített munkaidő.'});
        }

        let breakStartValue = breakStart ? toSqlDateTime(breakStart) : null;
        let breakEndValue = breakEnd ? toSqlDateTime(breakEnd) : null;

        const [dayTypeRows] = await pool.execute(
            `SELECT gl_cal_day_type FROM GlobalCalendar WHERE gl_cal_date = ? LIMIT 1`,
            [workingDate]
        );

        const workingDateType = dayTypeRows.length > 0
            ? (DAY_TYPE_MAP[dayTypeRows[0].gl_cal_day_type] || 'workday')
            : 'workday';

        const breakWeekday = new Date(`${workingDate}T00:00:00`).getDay();
        const isBreakWorkingDay = workingDateType === 'transferred'
            || (workingDateType === 'workday'
                && breakWeekday !== 0 && breakWeekday !== 6);

        if (!breakStartValue && !breakEndValue && isBreakWorkingDay) {
            const [template] = await pool.execute(
                `SELECT
                    employee_break_start, employee_break_end
                 FROM Employees
                 WHERE employee_id = ?`,
                [targetEmployeeId]
            );

            if (template.length > 0 && template[0].employee_break_start) {
                const workStartTime = toSqlDateTime(workStart).slice(11, 19);
                const breakDate = String(template[0].employee_break_start) < workStartTime
                    ? addDays(workingDate, 1)
                    : workingDate;

                breakStartValue = `${breakDate} ${template[0].employee_break_start}`;
                breakEndValue = `${breakDate} ${template[0].employee_break_end}`;
            }
        }

        const [result] = await pool.execute(
            `INSERT INTO WorkingTimeTracking (
                wtt_employee_id, wtt_working_date,
                wtt_working_start, wtt_working_end,
                wtt_schedule_start, wtt_schedule_end,
                wtt_brk_start, wtt_brk_end, wtt_note
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                targetEmployeeId, workingDate,
                toSqlDateTime(workStart), toSqlDateTime(workEnd),
                scheduleStart ? toSqlDateTime(scheduleStart) : null,
                scheduleEnd ? toSqlDateTime(scheduleEnd) : null,
                breakStartValue, breakEndValue, note || null
            ]
        );

        return res.status(201).json({message: 'A munkaidő rögzítésre került.', id: result.insertId});
    } catch (error) {
        console.error('Munkaidő rögzítési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const list = async (req, res) => {
    const { employeeId, year, month } = req.query;

    const yearNumber = Number(year);
    const monthNumber = Number(month);

    if (!yearNumber || !monthNumber || monthNumber < 1 || monthNumber > 12) {
        return res.status(400).json({ message: 'Érvényes évet és hónapot kell megadni.' });
    }

    const targetEmployeeId = Number(employeeId) || req.user.employeeId;
    const isSelf = targetEmployeeId === req.user.employeeId;

    try {
        if (!isSelf) {
            const hasAccess = await canAccessEmployee(
                req.user.userId, req.user.employeeId, targetEmployeeId, req.user.role
            );

            if (!hasAccess) {
                return res.status(403).json({ message: 'Ehhez a dolgozóhoz nincs hozzáférése.' });
            }
        }

        const report = await buildMonthlyReport(targetEmployeeId, yearNumber, monthNumber);

        if (!report) {
            return res.status(404).json({ message: 'A dolgozó nem található.' });
        }

        return res.status(200).json(report);
    } catch (error) {
        console.error('Munkaidő lekérdezési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const update = async (req, res) => {
    const entryId = Number(req.params.id);

    if (!entryId) {
        return res.status(400).json({ message: 'Érvénytelen azonosító.' });
    }

    const { note } = req.body || {};

    try {
        const [existing] = await pool.execute(
            `SELECT wtt_employee_id, wtt_working_date,
                    wtt_working_start, wtt_working_end
             FROM WorkingTimeTracking
             WHERE wtt_id = ?`,
            [entryId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'A munkaidő-bejegyzés nem található.' });
        }

        const entry = existing[0];
        const isSelf = entry.wtt_employee_id === req.user.employeeId;

        if (!isSelf) {
            const hasAccess = await canAccessEmployee(
                req.user.userId, req.user.employeeId, entry.wtt_employee_id, req.user.role
            );

            if (!hasAccess) {
                return res.status(403).json({ message: 'Ehhez a dolgozóhoz nincs hozzáférése.' });
            }
        }

        const daysPassed = daysSince(entry.wtt_working_date);

        if (req.user.role === 'Dolgozó' && daysPassed > 0) {
            return res.status(403).json({
                message: 'A lezárt munkaidő-adat a dolgozói jogosultsággal nem módosítható.'
            });
        }

        if (daysPassed > BACKDATE_LIMIT_DAYS && req.user.role !== 'HR-Bér') {
            return res.status(403).json({
                message: 'Visszamenőleges módosításra legfeljebb három napig van lehetőség.'
            });
        }

        if (daysPassed > 0 && !note) {
            return res.status(400).json({
                message: 'Visszamenőleges módosításhoz indoklás megadása kötelező.'
            });
        }

        if (req.user.role === 'Dolgozó'
            && (req.body.scheduleStart !== undefined
                || req.body.scheduleEnd !== undefined)) {
            return res.status(403).json({
                message: 'A beosztás szerinti munkaidőt a vezető határozza meg.'
            });
        }

        const fields = [];
        const values = [];

        for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
            if (req.body[key] !== undefined) {
                fields.push(`${column} = ?`);
                values.push(req.body[key] ? toSqlDateTime(req.body[key]) : null);
            }
        }

        if (note !== undefined) {
            fields.push('wtt_note = ?');
            values.push(note || null);
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'Nincs módosítandó mező.' });
        }

        const newStart = req.body.workStart !== undefined
            ? req.body.workStart : entry.wtt_working_start;
        const newEnd = req.body.workEnd !== undefined
            ? req.body.workEnd : entry.wtt_working_end;

        if (newStart && newEnd) {
            const start = toDate(newStart);
            const end = toDate(newEnd);

            if (end <= start) {
                return res.status(400).json({
                    message: 'A munkavégzés vége nem lehet korábbi a kezdeténél.'
                });
            }

            if (Math.round((end - start) / (1000 * 60)) > MAX_DAILY_MINUTES) {
                return res.status(400).json({
                    message: 'Egy munkanapra legfeljebb 12 óra munkaidő rögzíthető.'
                });
            }
        }

        if (newStart && req.body.breakStart) {
            const breakError = breakTimingError(newStart, req.body.breakStart);

            if (breakError) {
                return res.status(400).json({ message: breakError });
            }
        }

        values.push(entryId);

        await pool.execute(
            `UPDATE WorkingTimeTracking SET ${fields.join(', ')} WHERE wtt_id = ?`,
            values
        );

        return res.status(200).json({ message: 'A munkaidő módosításra került.' });
    } catch (error) {
        console.error('Munkaidő módosítási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const remove = async (req, res) => {
    const entryId = Number(req.params.id);

    if (!entryId) {
        return res.status(400).json({ message: 'Érvénytelen azonosító.' });
    }

    try {
        const [existing] = await pool.execute(
            `SELECT wtt_employee_id, wtt_working_date, wtt_is_ordered
             FROM WorkingTimeTracking
             WHERE wtt_id = ?`,
            [entryId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'A munkaidő-bejegyzés nem található.' });
        }

        const entry = existing[0];
        const isSelf = entry.wtt_employee_id === req.user.employeeId;

        if (!isSelf) {
            const hasAccess = await canAccessEmployee(
                req.user.userId, req.user.employeeId, entry.wtt_employee_id, req.user.role
            );

            if (!hasAccess) {
                return res.status(403).json({ message: 'Ehhez a dolgozóhoz nincs hozzáférése.' });
            }
        }

        const daysPassed = daysSince(entry.wtt_working_date);

        if (req.user.role === 'Dolgozó' && daysPassed > 0) {
            return res.status(403).json({
                message: 'A lezárt munkaidő-adat a dolgozói jogosultsággal nem törölhető.'
            });
        }

        if (daysPassed > BACKDATE_LIMIT_DAYS && req.user.role !== 'HR-Bér') {
            return res.status(403).json({
                message: 'Visszamenőleges törlésre legfeljebb három napig van lehetőség.'
            });
        }

        if (entry.wtt_is_ordered) {
            await pool.execute(
                `UPDATE WorkingTimeTracking
                 SET wtt_working_start = NULL, wtt_working_end = NULL,
                     wtt_brk_start = NULL, wtt_brk_end = NULL,
                     wtt_schedule_start = NULL, wtt_schedule_end = NULL,
                     wtt_note = NULL
                 WHERE wtt_id = ?`,
                [entryId]
            );

            return res.status(200).json({
                message: 'A rögzített időpontok törlésre kerültek, '
                    + 'az elrendelés jelölője megmaradt.'
            });
        }

        await pool.execute(
            `DELETE FROM WorkingTimeTracking WHERE wtt_id = ?`,
            [entryId]
        );

        return res.status(200).json({ message: 'A nap rögzítése törlésre került.' });
    } catch (error) {
        console.error('Munkaidő törlési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const setOrdered = async (req, res) => {
    const { employeeId, workingDate, isOrdered } = req.body || {};

    if (!employeeId || !workingDate) {
        return res.status(400).json({
            message: 'A dolgozó azonosítója és a munkanap megadása kötelező.'
        });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(workingDate)) {
        return res.status(400).json({ message: 'A munkanap formátuma érvénytelen.' });
    }

    if (typeof isOrdered !== 'boolean') {
        return res.status(400).json({
            message: 'Az elrendelés jelölőjét logikai értékként kell megadni.'
        });
    }

    const targetEmployeeId = Number(employeeId);

    if (!targetEmployeeId) {
        return res.status(400).json({ message: 'Érvénytelen dolgozói azonosító.' });
    }

    if (targetEmployeeId === req.user.employeeId) {
        return res.status(403).json({
            message: 'Saját munkavégzés elrendelésére nincs lehetőség.'
        });
    }

    try {
        const hasAccess = await canAccessEmployee(
            req.user.userId, req.user.employeeId, targetEmployeeId, req.user.role
        );

        if (!hasAccess) {
            return res.status(403).json({ message: 'Ehhez a dolgozóhoz nincs hozzáférése.' });
        }

        const [covered] = await pool.execute(
            `SELECT 1
             FROM Requests
             WHERE request_employee_id = ?
               AND request_status = 'Jóváhagyva'
               AND ? BETWEEN request_start_date AND request_end_date
             LIMIT 1`,
            [targetEmployeeId, workingDate]
        );

        if (covered.length > 0) {
            return res.status(409).json({
                message: 'Jóváhagyott távolléti jogcímmel fedett napra elrendelés nem adható.'
            });
        }

        const [existing] = await pool.execute(
            `SELECT wtt_id
             FROM WorkingTimeTracking
             WHERE wtt_employee_id = ? AND wtt_working_date = ?
             LIMIT 1`,
            [targetEmployeeId, workingDate]
        );

        if (existing.length > 0) {
            await pool.execute(
                `UPDATE WorkingTimeTracking
                 SET wtt_is_ordered = ?, wtt_ordered_by = ?
                 WHERE wtt_id = ?`,
                [isOrdered ? 1 : 0, isOrdered ? req.user.userId : null, existing[0].wtt_id]
            );

            return res.status(200).json({
                message: isOrdered
                    ? 'Az elrendelés rögzítésre került.'
                    : 'Az elrendelés visszavonásra került.',
                id: existing[0].wtt_id
            });
        }

        if (!isOrdered) {
            return res.status(404).json({
                message: 'Erre a napra nincs elrendelés, amit vissza lehetne vonni.'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO WorkingTimeTracking (
                wtt_employee_id, wtt_working_date, wtt_is_ordered, wtt_ordered_by
             ) VALUES (?, ?, 1, ?)`,
            [targetEmployeeId, workingDate, req.user.userId]
        );

        return res.status(201).json({
            message: 'Az elrendelés rögzítésre került.',
            id: result.insertId
        });
    } catch (error) {
        console.error('Elrendelési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const listDaily = async (req, res) => {
    const date = req.query.date;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Érvényes dátumot kell megadni.' });
    }

    try {
        const ids = await getAccessibleEmployeeIds(
            req.user.userId, req.user.employeeId, req.user.role
        );

        if (!ids.includes(req.user.employeeId)) {
            ids.push(req.user.employeeId);
        }

        if (ids.length === 0) {
            return res.status(200).json({ date, dayType: 'workday', employees: [] });
        }

        const placeholders = ids.map(() => '?').join(', ');

        const [calendarRows] = await pool.execute(
            `SELECT gl_cal_day_type FROM GlobalCalendar WHERE gl_cal_date = ?`,
            [date]
        );

        const dayType = calendarRows.length > 0
            ? (DAY_TYPE_MAP[calendarRows[0].gl_cal_day_type] || 'workday')
            : 'workday';

        const [employeeRows] = await pool.execute(
            `SELECT e.employee_id, e.employee_code,
                    e.employee_last_name, e.employee_first_name,
                    e.employee_core_start, e.employee_core_end,
                    e.employee_core_hour_id AS own_core_hour_id,
                    g.user_group_rotation_position, g.user_group_rotation_start,
                    c.core_hour_start, c.core_hour_end,
                    w.work_schedule_name, w.work_schedule_is_shift
             FROM Employees e
             JOIN EmployeeSettings   s ON s.employee_id = e.employee_id
             LEFT JOIN UserGroups    g ON g.user_group_id     = e.employee_user_group_id
             LEFT JOIN CoreHours     c ON c.core_hour_id     = s.employee_setting_core_hour_id
             LEFT JOIN WorkSchedules w ON w.work_schedule_id = s.employee_setting_work_schedule_id
             WHERE e.employee_id IN (${placeholders})
             ORDER BY e.employee_last_name, e.employee_first_name`,
            ids
        );

        const [entryRows] = await pool.execute(
            `SELECT wtt_id, wtt_employee_id, wtt_working_start, wtt_working_end,
                    wtt_brk_start, wtt_brk_end, wtt_is_ordered
             FROM WorkingTimeTracking
             WHERE wtt_working_date = ? AND wtt_employee_id IN (${placeholders})`,
            [date, ...ids]
        );

        const entryByEmployee = {};
        for (const row of entryRows) {
            entryByEmployee[row.wtt_employee_id] = row;
        }

        const [absenceRows] = await pool.execute(
            `SELECT r.request_employee_id, r.request_status,
                    a.absence_name, a.absence_rec_type
             FROM Requests r
             JOIN Absences a ON a.absence_id = r.request_absence_id
             WHERE r.request_status IN ('Függőben', 'Jóváhagyva')
               AND r.request_start_date <= ? AND r.request_end_date >= ?
               AND r.request_employee_id IN (${placeholders})`,
            [date, date, ...ids]
        );

        const absenceByEmployee = {};
        for (const row of absenceRows) {
            const current = absenceByEmployee[row.request_employee_id];
            if (!current || row.request_status === 'Jóváhagyva') {
                absenceByEmployee[row.request_employee_id] = row;
            }
        }

        const needsRotation = employeeRows.some((row) =>
            row.work_schedule_is_shift
            && !row.employee_core_start && !row.own_core_hour_id
            && row.user_group_rotation_position !== null
            && row.user_group_rotation_position !== undefined
        );
        const rotationSlots = needsRotation ? await loadRotationSlots() : [];

        const employees = employeeRows.map((row) => {
            const entry = entryByEmployee[row.employee_id];
            const absence = absenceByEmployee[row.employee_id];

            const usesRotation = Boolean(row.work_schedule_is_shift)
                && !row.employee_core_start && !row.own_core_hour_id
                && row.user_group_rotation_position !== null
                && row.user_group_rotation_position !== undefined;

            const rotated = usesRotation
                ? resolveRotation(
                    date,
                    row.user_group_rotation_position,
                    row.user_group_rotation_start,
                    rotationSlots
                  )
                : null;

            const templateStart = rotated
                ? rotated.start
                : (row.employee_core_start || row.core_hour_start);
            const templateEnd = rotated
                ? rotated.end
                : (row.employee_core_end || row.core_hour_end);

            return {
                id: row.employee_id,
                code: row.employee_code,
                name: `${row.employee_last_name} ${row.employee_first_name}`,
                workSchedule: row.work_schedule_name,
                isShiftWorker: Boolean(row.work_schedule_is_shift),
                templateStart: templateStart ? String(templateStart).slice(0, 5) : null,
                templateEnd: templateEnd ? String(templateEnd).slice(0, 5) : null,
                entry: entry
                    ? {
                        id: entry.wtt_id,
                        workStart: entry.wtt_working_start,
                        workEnd: entry.wtt_working_end,
                        breakStart: entry.wtt_brk_start,
                        breakEnd: entry.wtt_brk_end,
                        isOrdered: Boolean(entry.wtt_is_ordered)
                      }
                    : null,
                absence: absence
                    ? {
                        name: absence.absence_name,
                        status: absence.request_status,
                        coversDay: absence.request_status === 'Jóváhagyva'
                                   && absence.absence_rec_type === 0
                      }
                    : null,
                isSelf: row.employee_id === req.user.employeeId
            };
        });

        return res.status(200).json({ date, dayType, employees });
    } catch (error) {
        console.error('Napi lista hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const createBulk = async (req, res) => {
    const { workingDate, entries } = req.body || {};

    if (!workingDate || !/^\d{4}-\d{2}-\d{2}$/.test(workingDate)) {
        return res.status(400).json({ message: 'Érvényes munkanapot kell megadni.' });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ message: 'Legalább egy dolgozó adatát meg kell adni.' });
    }

    const daysPassed = daysSince(workingDate);

    if (daysPassed < 0) {
        return res.status(400).json({ message: 'Jövőbeli napra munkaidő nem rögzíthető.' });
    }

    if (req.user.role !== 'HR-Bér' && daysPassed > BACKDATE_LIMIT_DAYS) {
        return res.status(403).json({
            message: 'Visszamenőleges rögzítésre legfeljebb három napig van lehetőség.'
        });
    }

    const bulkWeekday = new Date(`${workingDate}T00:00:00`).getDay();
    const results = [];

    try {
        const [bulkDayTypeRows] = await pool.execute(
            `SELECT gl_cal_day_type FROM GlobalCalendar WHERE gl_cal_date = ? LIMIT 1`,
            [workingDate]
        );

        const bulkDayType = bulkDayTypeRows.length > 0
            ? (DAY_TYPE_MAP[bulkDayTypeRows[0].gl_cal_day_type] || 'workday')
            : 'workday';

        const isBulkWorkingDay = bulkDayType === 'transferred'
            || (bulkDayType === 'workday'
                && bulkWeekday !== 0 && bulkWeekday !== 6);
        for (const item of entries) {
            const employeeId = Number(item.employeeId);
            const { workStart, workEnd, breakStart, breakEnd } = item;

            if (!employeeId || !workStart || !workEnd) {
                results.push({ employeeId, status: 'error', message: 'Hiányos adat.' });
                continue;
            }

            const start = new Date(String(workStart).replace(' ', 'T'));
            const end = new Date(String(workEnd).replace(' ', 'T'));

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
                results.push({ employeeId, status: 'error', message: 'Érvénytelen időpont.' });
                continue;
            }

            if (Math.round((end - start) / (1000 * 60)) > MAX_DAILY_MINUTES) {
                results.push({ employeeId, status: 'error', message: 'Több mint 12 óra.' });
                continue;
            }

            const hasAccess = employeeId === req.user.employeeId
                || await canAccessEmployee(
                    req.user.userId, req.user.employeeId, employeeId, req.user.role
                );

            if (!hasAccess) {
                results.push({ employeeId, status: 'error', message: 'Nincs hozzáférés.' });
                continue;
            }

            const [schedule] = await pool.execute(
                `SELECT w.work_schedule_name,
                        e.employee_break_start, e.employee_break_end
                 FROM Employees e
                 JOIN EmployeeSettings s ON s.employee_id = e.employee_id
                 JOIN WorkSchedules w ON w.work_schedule_id = s.employee_setting_work_schedule_id
                 WHERE e.employee_id = ?`,
                [employeeId]
            );

            if (schedule.length > 0 && schedule[0].work_schedule_name === 'Kötetlen') {
                results.push({
                    employeeId, status: 'error',
                    message: 'Kötetlen munkarendben nincs napi rögzítés.'
                });
                continue;
            }

            const [covered] = await pool.execute(
                `SELECT a.absence_name
                 FROM Requests r
                 JOIN Absences a ON a.absence_id = r.request_absence_id
                 WHERE r.request_employee_id = ?
                   AND r.request_status = 'Jóváhagyva'
                   AND a.absence_rec_type = 0
                   AND ? BETWEEN r.request_start_date AND r.request_end_date
                 LIMIT 1`,
                [employeeId, workingDate]
            );

            if (covered.length > 0) {
                results.push({
                    employeeId, status: 'error',
                    message: `Jogcímmel fedett nap (${covered[0].absence_name}).`
                });
                continue;
            }            

            const [existing] = await pool.execute(
                `SELECT wtt_id, wtt_brk_start FROM WorkingTimeTracking
                 WHERE wtt_employee_id = ? AND wtt_working_date = ? LIMIT 1`,
                [employeeId, workingDate]
            );

            let breakStartValue = breakStart ? toSqlDateTime(breakStart) : null;
            let breakEndValue = breakEnd ? toSqlDateTime(breakEnd) : null;

            if (breakStartValue) {
                const breakError = breakTimingError(workStart, breakStartValue);

                if (breakError) {
                    results.push({ employeeId, status: 'error', message: breakError });
                    continue;
                }
            }

            const breakAlreadyStored = existing.length > 0 && Boolean(existing[0].wtt_brk_start);

            if (!breakStartValue && !breakEndValue && isBulkWorkingDay && !breakAlreadyStored
                && schedule.length > 0 && schedule[0].employee_break_start) {
                const workStartTime = toSqlDateTime(workStart).slice(11, 19);
                const breakDate = String(schedule[0].employee_break_start) < workStartTime
                    ? addDays(workingDate, 1)
                    : workingDate;

                breakStartValue = `${breakDate} ${schedule[0].employee_break_start}`;
                breakEndValue = `${breakDate} ${schedule[0].employee_break_end}`;
            }

            if (existing.length > 0) {
                await pool.execute(
                    `UPDATE WorkingTimeTracking
                     SET wtt_working_start = ?, wtt_working_end = ?,
                         wtt_brk_start = COALESCE(?, wtt_brk_start),
                         wtt_brk_end   = COALESCE(?, wtt_brk_end)
                     WHERE wtt_id = ?`,
                    [
                        toSqlDateTime(workStart), toSqlDateTime(workEnd),
                        breakStartValue, breakEndValue, existing[0].wtt_id
                    ]
                );

                results.push({ employeeId, status: 'updated', id: existing[0].wtt_id });
                continue;
            }

            const [inserted] = await pool.execute(
                `INSERT INTO WorkingTimeTracking (
                    wtt_employee_id, wtt_working_date,
                    wtt_working_start, wtt_working_end,
                    wtt_brk_start, wtt_brk_end
                 ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    employeeId, workingDate,
                    toSqlDateTime(workStart), toSqlDateTime(workEnd),
                    breakStartValue, breakEndValue
                ]
            );

            results.push({ employeeId, status: 'created', id: inserted.insertId });
        }

        const failed = results.filter((item) => item.status === 'error').length;

        return res.status(200).json({
            message: failed === 0
                ? 'A munkaidők rögzítésre kerültek.'
                : `${results.length - failed} sor rögzítve, ${failed} sor hibás.`,
            results
        });
    } catch (error) {
        console.error('Csoportos rögzítési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { create, list, update, remove, setOrdered, listDaily, createBulk };