const pool = require('../config/db');
const { ACTIVE_SQL, PENDING, IN_PROGRESS, APPROVED } = require('../services/requestStatus');
const { canAccessEmployee, getAccessibleEmployeeIds } = require('../services/employeeScope');

const URGENT_HOURS = 24;

const BACKDATE_LIMIT_DAYS = {
    'Dolgozó': 0,
    'Vezető': 3,
    'Admin': 3
};

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const toDate = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00`);

const hoursBetween = (from, to) => (to.getTime() - from.getTime()) / (1000 * 60 * 60);

const SELECT_FIELDS = `
    r.request_id, r.request_employee_id, r.request_absence_id,
    r.request_start_date, r.request_end_date, r.request_message,
    r.request_status, r.request_decision_at, r.request_decision_reason,
    r.request_created_at,
    a.absence_name, a.absence_is_paid, a.absence_category,
    a.absence_is_open_ended, a.absence_needs_approval,
    r.request_closed_at,
    IF(a.absence_is_open_ended = 1 AND r.request_closed_at IS NULL,
       CURDATE(), r.request_end_date) AS effective_end_date,
    e.employee_code, e.employee_first_name, e.employee_last_name,
    d.user_username AS decision_by_username
`;

const FROM_CLAUSE = `
    FROM Requests r
    JOIN Absences  a ON a.absence_id  = r.request_absence_id
    JOIN Employees e ON e.employee_id = r.request_employee_id
    LEFT JOIN Users d ON d.user_id    = r.request_decision_by
`;

const toOutput = (row) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDay = toDate(row.request_start_date);
    const createdAt = new Date(String(row.request_created_at).replace(' ', 'T'));
    const isPending = row.request_status === PENDING;

    return {
        id: row.request_id,
        employeeId: row.request_employee_id,
        employeeCode: row.employee_code,
        employeeName: `${row.employee_last_name} ${row.employee_first_name}`,
        absenceId: row.request_absence_id,
        absenceName: row.absence_name,
        isPaid: Boolean(row.absence_is_paid),
        isOpenEnded: Boolean(row.absence_is_open_ended),
        needsApproval: Boolean(row.absence_needs_approval),
        isClosable: Boolean(row.absence_is_open_ended) && closable(row),
        category: row.absence_category,
        startDate: row.request_start_date,
        endDate: row.effective_end_date,
        closedAt: row.request_closed_at,
        message: row.request_message,
        status: row.request_status,
        decisionAt: row.request_decision_at,
        decisionReason: row.request_decision_reason,
        decisionBy: row.decision_by_username,
        createdAt: row.request_created_at,
        isUrgent: isPending && hoursBetween(createdAt, startDay) < URGENT_HOURS,
        isBackdated: isPending && createdAt > startDay,
        isExpired: isPending && startDay < today && createdAt <= startDay
    };
};

const closable = (row) => !row.request_closed_at;

const create = async (req, res) => {
    const { employeeId, absenceId, startDate, endDate, message } = req.body || {};

    if (!absenceId || !startDate) {
        return res.status(400).json({
            message: 'A távolléti jogcím és a kezdő nap megadása kötelező.'
        });
    }

    if (!isValidDate(startDate) || (endDate && !isValidDate(endDate))) {
        return res.status(400).json({ message: 'A dátum formátuma érvénytelen.' });
    }

    const limitDays = BACKDATE_LIMIT_DAYS[req.user.role];

    if (limitDays !== undefined) {
        const ma = new Date();
        ma.setHours(0, 0, 0, 0);

        const eltelt = Math.round(
            (ma.getTime() - toDate(startDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (eltelt > limitDays) {
            return res.status(400).json({
                message: limitDays === 0
                    ? 'A kérelem kezdő napja nem lehet korábbi a mai napnál. '
                        + 'Visszamenőleges rögzítést a felettes vagy a HR végezhet.'
                    : `A kérelem kezdő napja legfeljebb ${limitDays} nappal `
                        + 'lehet korábbi a mai napnál.'
            });
        }
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

        const [absences] = await pool.execute(
            `SELECT absence_id, absence_name, absence_is_open_ended,
                    absence_needs_approval, absence_status
             FROM Absences WHERE absence_id = ?`,
            [absenceId]
        );

        if (absences.length === 0 || absences[0].absence_status !== 1) {
            return res.status(400).json({
                message: 'A megadott távolléti jogcím nem használható.'
            });
        }

        const absence = absences[0];

        if (!absence.absence_is_open_ended && !endDate) {
            return res.status(400).json({
                message: 'A távollét záró napjának megadása kötelező.'
            });
        }

        const effectiveEndDate = endDate || startDate;

        if (toDate(effectiveEndDate) < toDate(startDate)) {
            return res.status(400).json({
                message: 'A távollét vége nem lehet korábbi a kezdeténél.'
            });
        }

        const [allowed] = await pool.execute(
            `SELECT 1
             FROM Employees e
             JOIN EmployeeSettings es ON es.employee_id = e.employee_id
             JOIN AbsenceWorkSchedules s ON s.work_schedule_id = es.employee_setting_work_schedule_id
             WHERE e.employee_id = ? AND s.absence_id = ?
             LIMIT 1`,
            [targetEmployeeId, absenceId]
        );

        if (allowed.length === 0) {
            return res.status(409).json({
                message: 'A megadott jogcím a dolgozó munkarendjében nem vehető igénybe.'
            });
        }

        const [overlap] = await pool.execute(
            `SELECT 1
             FROM Requests r
             JOIN Absences a ON a.absence_id = r.request_absence_id
             WHERE r.request_employee_id = ?
               AND r.request_status IN (${ACTIVE_SQL})
               AND r.request_start_date <= ?
               AND IF(a.absence_is_open_ended = 1 AND r.request_closed_at IS NULL, CURDATE(), r.request_end_date) >= ?
             LIMIT 1`,
            [targetEmployeeId, effectiveEndDate, startDate]
        );

        if (overlap.length > 0) {
            return res.status(409).json({
                message: 'Az érintett napokra már van függőben lévő vagy jóváhagyott kérelem.'
            });
        }

        const needsApproval = Boolean(absence.absence_needs_approval);

        const [result] = await pool.execute(
            `INSERT INTO Requests (
                request_employee_id, request_absence_id,
                request_start_date, request_end_date, request_message,
                request_status, request_decision_by, request_decision_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                targetEmployeeId, absenceId, startDate, effectiveEndDate,
                message || null,
                needsApproval ? PENDING : IN_PROGRESS,
                needsApproval ? null : req.user.userId,
                needsApproval ? null : new Date()
            ]
        );

        return res.status(201).json({
            message: needsApproval
                ? 'A kérelem rögzítésre került.'
                : 'A távollét folyamatban lévőként rögzítésre került, '
                  + 'elbírálást nem igényel.',
            id: result.insertId
        });
    } catch (error) {
        console.error('Kérelem rögzítési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const list = async (req, res) => {
    const scope = req.query.scope;
    const isManaged = scope === 'pending' || scope === 'managed';
    const pendingOnly = scope === 'pending';

    try {
        if (!isManaged) {
            const [rows] = await pool.execute(
                `SELECT ${SELECT_FIELDS} ${FROM_CLAUSE}
                 WHERE r.request_employee_id = ?
                 ORDER BY r.request_start_date DESC`,
                [req.user.employeeId]
            );

            return res.status(200).json({ requests: rows.map(toOutput) });
        }

        const ids = await getAccessibleEmployeeIds(
            req.user.userId, req.user.employeeId, req.user.role
        );

        const others = ids.filter((id) => id !== req.user.employeeId);

        if (others.length === 0) {
            return res.status(200).json({ requests: [] });
        }

        const placeholders = others.map(() => '?').join(', ');

        const statusFilter = pendingOnly
            ? `AND r.request_status = '${PENDING}'`
            : '';

        const [rows] = await pool.execute(
            `SELECT ${SELECT_FIELDS} ${FROM_CLAUSE}
             WHERE r.request_employee_id IN (${placeholders})
               ${statusFilter}
             ORDER BY r.request_start_date DESC`,
            others
        );

        return res.status(200).json({ requests: rows.map(toOutput) });
    } catch (error) {
        console.error('Kérelem lekérdezési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const close = async (req, res) => {
    const requestId = Number(req.params.id);
    const { endDate } = req.body || {};

    if (!requestId) {
        return res.status(400).json({ message: 'Érvénytelen azonosító.' });
    }

    if (!endDate) {
        return res.status(400).json({
            message: 'A távollét záró napjának megadása kötelező.'
        });
    }

    if (req.user.role !== 'HR-Bér' && req.user.role !== 'Admin') {
        return res.status(403).json({
            message: 'A nyitott végű távollét lezárása a HR feladata.'
        });
    }

    try {
        const [existing] = await pool.execute(
            `SELECT r.request_id, r.request_employee_id, r.request_start_date,
                    r.request_end_date, r.request_status, r.request_closed_at,
                    a.absence_is_open_ended
             FROM Requests r
             JOIN Absences a ON a.absence_id = r.request_absence_id
             WHERE r.request_id = ?`,
            [requestId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'A kérelem nem található.' });
        }

        const request = existing[0];

        if (!request.absence_is_open_ended) {
            return res.status(400).json({
                message: 'Csak nyitott végű jogcím zárható le utólag.'
            });
        }

        if (request.request_status === 'Elutasítva'
            || request.request_status === 'Visszavonva') {
            return res.status(409).json({
                message: `A kérelem állapota ${request.request_status}, ezért nem zárható le.`
            });
        }

        if (request.request_closed_at) {
            return res.status(409).json({
                message: 'A távollét már lezárásra került, ezért nem módosítható.'
            });
        }

        if (toDate(endDate) < toDate(request.request_start_date)) {
            return res.status(400).json({
                message: 'A távollét vége nem lehet korábbi a kezdeténél.'
            });
        }

        const [overlap] = await pool.execute(
            `SELECT 1
             FROM Requests r
             JOIN Absences a ON a.absence_id = r.request_absence_id
             WHERE r.request_employee_id = ?
               AND r.request_id <> ?
               AND r.request_status IN (${ACTIVE_SQL})
               AND r.request_start_date <= ?
               AND IF(a.absence_is_open_ended = 1 AND r.request_closed_at IS NULL, CURDATE(), r.request_end_date) >= ?
             LIMIT 1`,
            [request.request_employee_id, requestId, endDate,
             request.request_start_date]
        );

        if (overlap.length > 0) {
            return res.status(409).json({
                message: 'A megadott időszak átfedi a dolgozó másik kérelmét.'
            });
        }

        await pool.execute(
            `UPDATE Requests
             SET request_end_date       = ?,
                 request_status         = '${APPROVED}',
                 request_decision_by    = ?,
                 request_decision_at    = NOW(),
                 request_closed_at      = NOW()
             WHERE request_id = ?`,
            [endDate, req.user.userId, requestId]
        );

        return res.status(200).json({
            message: 'A távollét lezárásra került.'
        });
    } catch (error) {
        console.error('Kérelem lezárási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const decide = async (req, res) => {
    const requestId = Number(req.params.id);
    const { status, reason } = req.body || {};

    if (!requestId) {
        return res.status(400).json({ message: 'Érvénytelen azonosító.' });
    }

    if (status !== APPROVED && status !== 'Elutasítva') {
        return res.status(400).json({
            message: 'A döntés csak jóváhagyás vagy elutasítás lehet.'
        });
    }

    if (status === 'Elutasítva' && !reason) {
        return res.status(400).json({
            message: 'Az elutasításhoz indoklás megadása kötelező.'
        });
    }

    try {
        const [existing] = await pool.execute(
            `SELECT request_employee_id, request_start_date, request_status,
                    request_created_at
             FROM Requests WHERE request_id = ?`,
            [requestId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'A kérelem nem található.' });
        }

        const request = existing[0];

        if (request.request_status === IN_PROGRESS) {
            return res.status(409).json({
                message: 'A folyamatban lévő távollét elbírálást nem igényel, '
                    + 'a lezárásával válik véglegessé.'
            });
        }

        if (request.request_status !== PENDING) {
            return res.status(409).json({
                message: `A kérelem már elbírálásra került, jelenlegi állapota: ${request.request_status}.`
            });
        }

        if (request.request_employee_id === req.user.employeeId) {
            return res.status(403).json({
                message: 'Saját kérelem elbírálására nincs lehetőség.'
            });
        }

        const hasAccess = await canAccessEmployee(
            req.user.userId, req.user.employeeId, request.request_employee_id, req.user.role
        );

        if (!hasAccess) {
            return res.status(403).json({ message: 'Ehhez a dolgozóhoz nincs hozzáférése.' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDay = toDate(request.request_start_date);
        const createdAt = new Date(
            String(request.request_created_at).replace(' ', 'T')
        );
        const isBackdated = createdAt > startDay;

        if (startDay < today && !isBackdated && req.user.role !== 'HR-Bér') {
            return res.status(409).json({
                message: 'A távollét kezdőnapja után a kérelmet már csak a HR '
                    + 'rendezheti, mert a döntési határidő eltelt.'
            });
        }

        await pool.execute(
            `UPDATE Requests
             SET request_status          = ?,
                 request_decision_by     = ?,
                 request_decision_at     = NOW(),
                 request_decision_reason = ?
             WHERE request_id = ?`,
            [status, req.user.userId, reason || null, requestId]
        );

        return res.status(200).json({
            message: status === APPROVED
                ? 'A kérelem jóváhagyásra került.'
                : 'A kérelem elutasításra került.'
        });
    } catch (error) {
        console.error('Kérelem elbírálási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const withdraw = async (req, res) => {
    const requestId = Number(req.params.id);

    if (!requestId) {
        return res.status(400).json({ message: 'Érvénytelen azonosító.' });
    }

    try {
        const [existing] = await pool.execute(
            `SELECT request_employee_id, request_status
             FROM Requests WHERE request_id = ?`,
            [requestId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'A kérelem nem található.' });
        }

        const request = existing[0];

        if (request.request_employee_id !== req.user.employeeId) {
            return res.status(403).json({
                message: 'Csak a saját kérelem vonható vissza.'
            });
        }

        if (request.request_status !== PENDING
            && request.request_status !== IN_PROGRESS) {
            return res.status(409).json({
                message: 'Csak függőben lévő vagy folyamatban lévő kérelem '
                    + 'vonható vissza.'
            });
        }

        await pool.execute(
            `UPDATE Requests SET request_status = 'Visszavonva' WHERE request_id = ?`,
            [requestId]
        );

        return res.status(200).json({ message: 'A kérelem visszavonásra került.' });
    } catch (error) {
        console.error('Kérelem visszavonási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { create, list, decide, close, withdraw };