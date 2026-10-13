const pool = require('../config/db');
const { canAccessEmployee } = require('../services/employeeScope');
const { calculateAllowances } = require('../services/allowanceCalculator');

const MAX_DAILY_MINUTES = 12 * 60;
const BACKDATE_LIMIT_DAYS = 3;
const DAY_TYPE_MAP = {
    'Munkaszüneti nap': 'holiday',
    'Pihenőnap': 'restday',
    'Munkanap': 'workday'
};
const UPDATABLE_FIELDS = {
    workStart: 'wtt_working_start',
    workEnd: 'wtt_working_end',
    breakStart: 'wtt_brk_start',
    breakEnd: 'wtt_brk_end',
    scheduleStart: 'wtt_schedule_start',
    scheduleEnd: 'wtt_schedule_end'
};



const toSqlDateTime = (value) => String(value).replace('T', ' ').slice(0, 19);

const daysSince = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(dateString);
    day.setHours(0, 0, 0, 0);
    return Math.round((today - day) / (1000 * 60 * 60 * 24));
};

const addDays = (dateString, count) => {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + count);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toDate = (value) => new Date(String(value).replace(' ', 'T'));

const minutesBetween = (from, to) => Math.round((toDate(to) - toDate(from)) / (1000 * 60));



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
                req.user.userId, req.user.employeeId, targetEmployeeId
            );

            if (!hasAccess) {
                return res.status(403).json({message: 'Ehhez a dolgozóhoz nincs hozzáférése.'});
            }
        }

        const [schedule] = await pool.execute(
            `SELECT
                w.work_schedule_name
             FROM Employees e
             JOIN WorkSchedules w ON w.work_schedule_id = e.employee_work_schedule_id
             WHERE e.employee_id = ?`,
            [targetEmployeeId]
        );

        if (schedule.length > 0 && schedule[0].work_schedule_name === 'Kötetlen') {
            return res.status(409).json({
                message: 'Kötetlen munkarendben napi munkaidő nem rögzíthető.'
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

        if (!breakStartValue && !breakEndValue) {
            const [template] = await pool.execute(
                `SELECT
                    employee_break_start, employee_break_end
                 FROM Employees
                 WHERE employee_id = ?`,
                [targetEmployeeId]
            );

            if (template.length > 0 && template[0].employee_break_start) {
                breakStartValue = `${workingDate} ${template[0].employee_break_start}`;
                breakEndValue = `${workingDate} ${template[0].employee_break_end}`;
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
                req.user.userId, req.user.employeeId, targetEmployeeId
            );

            if (!hasAccess) {
                return res.status(403).json({ message: 'Ehhez a dolgozóhoz nincs hozzáférése.' });
            }
        }

        const [employees] = await pool.execute(
            `SELECT
                e.employee_break_minutes, e.employee_break_paid,
                e.employee_core_start, e.employee_core_end,
                c.core_hour_start, c.core_hour_end,
                w.work_schedule_is_shift
             FROM Employees e
             LEFT JOIN CoreHours     c ON c.core_hour_id     = e.employee_core_hour_id
             LEFT JOIN WorkSchedules w ON w.work_schedule_id = e.employee_work_schedule_id
             WHERE e.employee_id = ?`,
            [targetEmployeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({ message: 'A dolgozó nem található.' });
        }

        const employee = employees[0];
        const templateStart = employee.employee_core_start || employee.core_hour_start;
        const templateEnd = employee.employee_core_end || employee.core_hour_end;
        const isShiftWorker = Boolean(employee.work_schedule_is_shift);

        const monthPrefix = `${yearNumber}-${String(monthNumber).padStart(2, '0')}`;
        const lastDayNumber = new Date(yearNumber, monthNumber, 0).getDate();
        const firstDay = `${monthPrefix}-01`;
        const lastDay = `${monthPrefix}-${lastDayNumber}`;

        const [rows] = await pool.execute(
            `SELECT 
                wtt_id, wtt_working_date, wtt_working_start, wtt_working_end,
                wtt_schedule_start, wtt_schedule_end,
                wtt_brk_start, wtt_brk_end,
                wtt_absence_id, wtt_is_ordered, wtt_note
             FROM WorkingTimeTracking
             WHERE wtt_employee_id = ?
               AND wtt_working_date BETWEEN ? AND ?
             ORDER BY wtt_working_date`,
            [targetEmployeeId, firstDay, lastDay]
        );

        const [calendarRows] = await pool.execute(
            `SELECT
                gl_cal_date, gl_cal_day_type
             FROM GlobalCalendar
             WHERE gl_cal_date BETWEEN ? AND ?`,
            [firstDay, addDays(lastDay, 1)]
        );

        const calendar = {};
        for (const entry of calendarRows) {
            calendar[entry.gl_cal_date] = DAY_TYPE_MAP[entry.gl_cal_day_type] || 'workday';
        }

        const rowsByDate = {};
        for (const row of rows) {
            rowsByDate[row.wtt_working_date] = row;
        }

        const days = [];
        const summaryAllowances = {};
        let summaryWorkedMinutes = 0;
        let summaryPresenceMinutes = 0;
        let summaryBreakMinutes = 0;
        let summaryBalanceMinutes = 0;
        let recordedDays = 0;

        for (let dayNumber = 1; dayNumber <= lastDayNumber; dayNumber++) {
            const date = `${monthPrefix}-${String(dayNumber).padStart(2, '0')}`;
            const dayType = calendar[date] || 'workday';
            const nextDayType = calendar[addDays(date, 1)] || 'workday';
            const row = rowsByDate[date];

            if (!row) {
                days.push({
                    id: null,
                    date,
                    dayType,
                    workStart: null,
                    workEnd: null,
                    absenceId: null,
                    isOrdered: false,
                    presenceMinutes: 0,
                    breakMinutes: 0,
                    scheduledMinutes: null,
                    balanceMinutes: null,
                    workedMinutes: 0,
                    allowances: {}
                });
                continue;
            }

            recordedDays++;

            if (!row.wtt_working_start || !row.wtt_working_end) {
                days.push({
                    id: row.wtt_id,
                    date,
                    dayType,
                    workStart: null,
                    workEnd: null,
                    absenceId: row.wtt_absence_id,
                    isOrdered: Boolean(row.wtt_is_ordered),
                    presenceMinutes: 0,
                    breakMinutes: 0,
                    scheduledMinutes: null,
                    balanceMinutes: null,
                    workedMinutes: 0,
                    allowances: {}
                });
                continue;
            }

            const weekday = new Date(`${date}T00:00:00`).getDay();
            const isWorkingDay = dayType === 'workday' && weekday !== 0 && weekday !== 6;

            let scheduleStart = row.wtt_schedule_start;
            let scheduleEnd = row.wtt_schedule_end;

            if (!scheduleStart && isWorkingDay && templateStart && templateEnd) {
                scheduleStart = `${date} ${templateStart}`;
                scheduleEnd = templateEnd > templateStart
                    ? `${date} ${templateEnd}`
                    : `${addDays(date, 1)} ${templateEnd}`;
            }

            const hasSchedule = Boolean(scheduleStart) && Boolean(scheduleEnd);
            const scheduleMissing = isWorkingDay && !hasSchedule;

            const breakMinutes = (row.wtt_brk_start && row.wtt_brk_end)
                ? minutesBetween(row.wtt_brk_start, row.wtt_brk_end)
                : (hasSchedule ? (employee.employee_break_minutes || 0) : 0);

            const breakDeduction = employee.employee_break_paid ? 0 : breakMinutes;

            const scheduledMinutes = scheduleMissing
                ? null
                : (hasSchedule
                    ? minutesBetween(scheduleStart, scheduleEnd) - breakDeduction
                    : 0);

            const result = calculateAllowances({
                workStart: toDate(row.wtt_working_start),
                workEnd: toDate(row.wtt_working_end),
                scheduleStart: hasSchedule ? toDate(scheduleStart) : null,
                scheduleEnd: hasSchedule ? toDate(scheduleEnd) : null,
                dayType,
                nextDayType,
                isShiftWorker,
                isOrdered: Boolean(row.wtt_is_ordered),
                breakMinutes,
                breakPaid: Boolean(employee.employee_break_paid)
            });

            const presenceMinutes = minutesBetween(
                row.wtt_working_start, row.wtt_working_end
            );

            const balanceMinutes = scheduledMinutes === null
                ? null
                : result.workedMinutes - scheduledMinutes - result.premiumOutsideMinutes;

            summaryWorkedMinutes += result.workedMinutes;
            summaryPresenceMinutes += presenceMinutes;
            summaryBreakMinutes += breakDeduction;
            summaryBalanceMinutes += balanceMinutes || 0;

            for (const [key, value] of Object.entries(result.allowances)) {
                summaryAllowances[key] = (summaryAllowances[key] || 0) + value;
            }

            days.push({
                id: row.wtt_id,
                date,
                dayType,
                workStart: row.wtt_working_start,
                workEnd: row.wtt_working_end,
                absenceId: row.wtt_absence_id,
                isOrdered: Boolean(row.wtt_is_ordered),
                presenceMinutes,
                breakMinutes: breakDeduction,
                scheduledMinutes,
                balanceMinutes,
                scheduleMissing,
                workedMinutes: result.workedMinutes,
                allowances: result.allowances
            });
        }

        return res.status(200).json({
            employeeId: targetEmployeeId,
            year: yearNumber,
            month: monthNumber,
            days,
            summary: {
                recordedDays,
                workedMinutes: summaryWorkedMinutes,
                presenceMinutes: summaryPresenceMinutes,
                breakMinutes: summaryBreakMinutes,
                balanceMinutes: summaryBalanceMinutes,
                allowances: summaryAllowances
            }
        });
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
                req.user.userId, req.user.employeeId, entry.wtt_employee_id
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
            req.user.userId, req.user.employeeId, targetEmployeeId
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

module.exports = { create, list, update, setOrdered };