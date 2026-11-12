const pool = require('./../config/db');
const { addDays, DAY_TYPE_MAP, isWorkingDay } = require('../utils/dateHelpers');
const { COVERING_SQL } = require('./requestStatus');

const ANNUAL_LEAVE_ABSENCE = 'Fizetett szabadság';

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
           AND r.request_status IN (${COVERING_SQL})
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
            const dayType = calendar[cursor] || 'workday';

            if (isWorkingDay(cursor, dayType)) {
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

module.exports = { ANNUAL_LEAVE_ABSENCE, buildLeaveBalance };