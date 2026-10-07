const pool = require('../config/db');
const { canAccessEmployee } = require('../services/employeeScope');

const MAX_DAILY_MINUTES = 12 * 60;
const BACKDATE_LIMIT_DAYS = 3;

const toSqlDateTime = (value) => String(value).replace('T', ' ').slice(0, 19);

const daysSince = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(dateString);
    day.setHours(0, 0, 0, 0);
    return Math.round((today - day) / (1000 * 60 * 60 * 24));
};

const create = async (req, res) => {
    const {
        employeeId, workingDate, workStart, workEnd,
        breakStart, breakEnd, scheduleStart, scheduleEnd, note
    } = req.body || {};

    if (!workingDate || !workStart || !workEnd) {
        return res.status(400).json({
            message: 'A munkanap, a munkavégzés kezdete és vége kötelező.'
        });
    }

    const targetEmployeeId = employeeId || req.user.employeeId;
    const isSelf = targetEmployeeId === req.user.employeeId;

    const start = new Date(workStart);
    const end = new Date(workEnd);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Érvénytelen időpont formátum.' });
    }

    if (end <= start) {
        return res.status(400).json({
            message: 'A munkavégzés vége nem lehet korábbi a kezdeténél.'
        });
    }

    const minutes = Math.round((end - start) / (1000 * 60));

    if (minutes > MAX_DAILY_MINUTES) {
        return res.status(400).json({
            message: 'Egy munkanapra legfeljebb 12 óra munkaidő rögzíthető.'
        });
    }

    const daysPassed = daysSince(workingDate);

    if (daysPassed < 0) {
        return res.status(400).json({
            message: 'Jövőbeli napra munkaidő nem rögzíthető.'
        });
    }

    if (isSelf && daysPassed > 0 && req.user.role === 'Dolgozó') {
        return res.status(403).json({
            message: 'A saját munkaidő csak a tárgynapon rögzíthető.'
        });
    }

    if (!isSelf && daysPassed > BACKDATE_LIMIT_DAYS && req.user.role !== 'HR-Bér') {
        return res.status(403).json({
            message: 'Visszamenőleges rögzítésre legfeljebb három napig van lehetőség.'
        });
    }

    try {
        if (!isSelf) {
            const hasAccess = await canAccessEmployee(
                req.user.userId, req.user.employeeId, targetEmployeeId
            );

            if (!hasAccess) {
                return res.status(403).json({
                    message: 'Ehhez a dolgozóhoz nincs hozzáférése.'
                });
            }
        }

        const [existing] = await pool.execute(
            `SELECT wtt_id FROM WorkingTimeTracking
             WHERE wtt_employee_id = ? AND wtt_working_date = ?
             LIMIT 1`,
            [targetEmployeeId, workingDate]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: 'Erre a napra már van rögzített munkaidő.'
            });
        }

        let breakStartValue = breakStart ? toSqlDateTime(breakStart) : null;
        let breakEndValue = breakEnd ? toSqlDateTime(breakEnd) : null;

        if (!breakStartValue && !breakEndValue) {
            const [template] = await pool.execute(
                `SELECT employee_break_start, employee_break_end
                 FROM Employees WHERE employee_id = ?`,
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

        return res.status(201).json({
            message: 'A munkaidő rögzítésre került.',
            id: result.insertId
        });
    } catch (error) {
        console.error('Munkaidő rögzítési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { create };