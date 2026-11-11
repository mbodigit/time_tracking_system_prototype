const pool = require('../config/db');
const { getAccessibleEmployeeIds } = require('../services/employeeScope');
const { buildMonthlyReport } = require('../services/monthlyReport');
const { buildLeaveBalance } = require('../services/leaveBalance');
const { employeeNotFound, invalidYearMonth, serverError } = require('../utils/apiResponse');

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
    if (report.isFlexible) {
        return [];
    }

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
        return invalidYearMonth(res);
    }

    try {
        const employeeId = req.user.employeeId;
        const currentDate = today();

        const currentReport = await buildMonthlyReport(employeeId, yearNumber, monthNumber);

        if (!currentReport) {
            return employeeNotFound(res);
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
        return serverError(res, 'Áttekintő hiba', error);
    }
};

module.exports = { overview };