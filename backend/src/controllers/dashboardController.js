const pool = require('../config/db');
const { getAccessibleEmployeeIds } = require('../services/employeeScope');
const { buildMonthlyReport } = require('../services/monthlyReport');
const { addDays, DAY_TYPE_MAP } = require('../services/dateHelpers');

const ANNUAL_LEAVE_ABSENCE = 'Fizetett szabadság';
const APPROVER_ROLES = ['Vezető', 'HR-Bér', 'Admin'];

const today = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildSummary = (report) => {
    let minusMinutes = 0;

    for (const day of report.days) {
        if (day.balanceMinutes && day.balanceMinutes < 0) {
            minusMinutes += day.balanceMinutes;
        }
    }

    return {
        workedMinutes: report.summary.workedMinutes,
        settledMinutes: report.summary.settledMinutes,
        absenceMinutes: report.summary.absenceMinutes,
        balanceMinutes: report.summary.balanceMinutes,
        minusMinutes,
        allowances: report.summary.allowances,
        absences: report.summary.absences
    };
};

const collectMissingRecordDays = (report, currentDate) => {
    const dates = [];

    for (const day of report.days) {
        if (day.id || day.absenceMinutes > 0 || day.date >= currentDate) {
            continue;
        }

        if (day.dayType !== 'workday') {
            continue;
        }

        const weekday = new Date(`${day.date}T00:00:00`).getDay();

        if (weekday === 0 || weekday === 6) {
            continue;
        }

        dates.push(day.date);
    }

    return dates;
};

const buildLeaveBalance = async (employeeId, yearNumber) => {
    const [employees] = await pool.execute(
        `SELECT employee_annual_leave_days FROM Employees WHERE employee_id = ?`,
        [employeeId]
    );

    const entitlementDays = employees.length > 0
        ? (employees[0].employee_annual_leave_days || 0)
        : 0;

    const firstDay = `${yearNumber}-01-01`;
    const lastDay = `${yearNumber}-12-31`;

    const [requests] = await pool.execute(
        `SELECT r.request_start_date, r.request_end_date
         FROM Requests r
         JOIN Absences a ON a.absence_id = r.request_absence_id
         WHERE r.request_employee_id = ?
           AND r.request_status = 'Jóváhagyva'
           AND a.absence_name = ?
           AND r.request_start_date <= ?
           AND r.request_end_date   >= ?`,
        [employeeId, ANNUAL_LEAVE_ABSENCE, lastDay, firstDay]
    );

    const [calendarRows] = await pool.execute(
        `SELECT gl_cal_date, gl_cal_day_type
         FROM GlobalCalendar
         WHERE gl_cal_date BETWEEN ? AND ?`,
        [firstDay, lastDay]
    );

    const calendar = {};
    for (const row of calendarRows) {
        calendar[row.gl_cal_date] = DAY_TYPE_MAP[row.gl_cal_day_type] || 'workday';
    }

    const usedDates = new Set();

    for (const request of requests) {
        let cursor = request.request_start_date < firstDay
            ? firstDay
            : request.request_start_date;
        const last = request.request_end_date > lastDay
            ? lastDay
            : request.request_end_date;

        while (cursor <= last) {
            const weekday = new Date(`${cursor}T00:00:00`).getDay();
            const dayType = calendar[cursor] || 'workday';

            if (dayType === 'workday' && weekday !== 0 && weekday !== 6) {
                usedDates.add(cursor);
            }

            cursor = addDays(cursor, 1);
        }
    }

    return {
        entitlementDays,
        usedDays: usedDates.size,
        remainingDays: entitlementDays - usedDates.size
    };
};

const buildOwnRequests = async (employeeId, currentDate) => {
    const [rows] = await pool.execute(
        `SELECT request_start_date
         FROM Requests
         WHERE request_employee_id = ? AND request_status = 'Függőben'`,
        [employeeId]
    );

    const expired = rows.filter((row) => row.request_start_date < currentDate).length;

    return { pending: rows.length, expired };
};

const buildApprovalQueue = async (req, currentDate) => {
    const ids = await getAccessibleEmployeeIds(
        req.user.userId, req.user.employeeId, req.user.role
    );

    const subordinateIds = ids.filter((id) => id !== req.user.employeeId);

    if (subordinateIds.length === 0) {
        return { pending: 0, expired: 0 };
    }

    const placeholders = subordinateIds.map(() => '?').join(', ');

    const [rows] = await pool.execute(
        `SELECT request_start_date
         FROM Requests
         WHERE request_status = 'Függőben'
           AND request_employee_id IN (${placeholders})`,
        subordinateIds
    );

    const expired = rows.filter((row) => row.request_start_date < currentDate).length;

    return { pending: rows.length, expired };
};

const overview = async (req, res) => {
    const yearNumber = Number(req.query.year);
    const monthNumber = Number(req.query.month);

    if (!yearNumber || !monthNumber || monthNumber < 1 || monthNumber > 12) {
        return res.status(400).json({ message: 'Érvényes évet és hónapot kell megadni.' });
    }

    try {
        const employeeId = req.user.employeeId;
        const currentDate = today();

        const currentReport = await buildMonthlyReport(employeeId, yearNumber, monthNumber);

        if (!currentReport) {
            return res.status(404).json({ message: 'A dolgozó nem található.' });
        }

        const previousDate = new Date(yearNumber, monthNumber - 2, 1);
        const previousYear = previousDate.getFullYear();
        const previousMonth = previousDate.getMonth() + 1;

        const previousReport = await buildMonthlyReport(
            employeeId, previousYear, previousMonth
        );

        const response = {
            year: yearNumber,
            month: monthNumber,
            allowanceTypes: currentReport.allowanceTypes,
            current: buildSummary(currentReport),
            previous: previousReport ? buildSummary(previousReport) : null,
            previousPeriod: { year: previousYear, month: previousMonth },
            leave: await buildLeaveBalance(employeeId, yearNumber),
            openItems: {
                ownRequests: await buildOwnRequests(employeeId, currentDate),
                missingRecordDays: collectMissingRecordDays(currentReport, currentDate)
            }
        };

        if (APPROVER_ROLES.includes(req.user.role)) {
            response.approval = await buildApprovalQueue(req, currentDate);
        }

        return res.status(200).json(response);
    } catch (error) {
        console.error('Áttekintő hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { overview };