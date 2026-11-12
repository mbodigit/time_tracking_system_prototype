const pool = require('../config/db');
const {
    getAccessibleEmployeeIds, getAccessibleGroups, canAccessEmployee
} = require('../services/employeeScope');
const { employeeAccessDenied, serverError } = require('../utils/apiResponse');
const { nameColumns, fullName } = require('../utils/employeeName');

const listEmployees = async (req, res) => {
    try {
        const ids = await getAccessibleEmployeeIds(
            req.user.userId, req.user.employeeId, req.user.role
        );

        if (!ids.includes(req.user.employeeId)) {
            ids.push(req.user.employeeId);
        }

        const placeholders = ids.map(() => '?').join(', ');

        const [rows] = await pool.execute(
            `SELECT e.employee_id, e.employee_code,
                    ${nameColumns('e')},
                    e.employee_user_group_id, g.user_group_name,
                    w.work_schedule_name
             FROM Employees e
             JOIN EmployeeSettings s ON s.employee_id = e.employee_id
             LEFT JOIN WorkSchedules w ON w.work_schedule_id = s.employee_setting_work_schedule_id
             LEFT JOIN UserGroups g ON g.user_group_id = e.employee_user_group_id
             WHERE e.employee_id IN (${placeholders})
             ORDER BY e.employee_last_name, e.employee_first_name`,
            ids
        );

        const groups = await getAccessibleGroups(
            req.user.userId, req.user.employeeId, req.user.role
        );

        return res.status(200).json({
            employees: rows.map((row) => ({
                id: row.employee_id,
                code: row.employee_code,
                name: fullName(row),
                groupId: row.employee_user_group_id,
                groupName: row.user_group_name,
                workSchedule: row.work_schedule_name,
                isSelf: row.employee_id === req.user.employeeId
            })),
            groups: groups.map((row) => ({
                id: row.user_group_id,
                name: row.user_group_name
            }))
        });
    } catch (error) {
        return serverError(res, 'Dolgozói lista hiba', error);
    }
};

const listAbsences = async (req, res) => {
    const targetEmployeeId = Number(req.query.employeeId) || req.user.employeeId;

    try {
        if (targetEmployeeId !== req.user.employeeId) {
            const hasAccess = await canAccessEmployee(
                req.user.userId, req.user.employeeId, targetEmployeeId, req.user.role
            );

            if (!hasAccess) {
                return employeeAccessDenied(res);
            }
        }

        const [rows] = await pool.execute(
            `SELECT a.absence_id, a.absence_name, a.absence_is_paid,
                    a.absence_is_open_ended
             FROM Absences a
             JOIN AbsenceWorkSchedules s ON s.absence_id = a.absence_id
             JOIN EmployeeSettings es ON es.employee_setting_work_schedule_id = s.work_schedule_id
             JOIN Employees e ON e.employee_id = es.employee_id
             WHERE e.employee_id = ? AND a.absence_status = 1
             ORDER BY a.absence_sort`,
            [targetEmployeeId]
        );

        return res.status(200).json({
            absences: rows.map((row) => ({
                id: row.absence_id,
                name: row.absence_name,
                isPaid: Boolean(row.absence_is_paid),
                isOpenEnded: Boolean(row.absence_is_open_ended)
            }))
        });
    } catch (error) {
        return serverError(res, 'Jogcímlista hiba', error);
    }
};

module.exports = { listEmployees, listAbsences };