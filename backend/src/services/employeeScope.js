const pool = require('../config/db');

const PRIVILEGED_ROLES = ['HR-Bér', 'Admin'];

const getAccessibleEmployeeIds = async (userId, employeeId, role) => {
    if (PRIVILEGED_ROLES.includes(role)) {
        const [all] = await pool.execute(`SELECT employee_id FROM Employees`);
        return all.map((row) => row.employee_id);
    }

    const [rows] = await pool.execute(
        `SELECT e.employee_id
         FROM Employees e
         LEFT JOIN UserGroups  g ON g.user_group_id       = e.employee_user_group_id
         LEFT JOIN Areas       a ON a.area_id             = g.user_group_area_id
         LEFT JOIN Departments d ON d.department_id       = g.user_group_department_id
         LEFT JOIN Shifts      s ON s.shift_id            = g.user_group_shift_id
         WHERE g.user_group_manager_id = ?
            OR a.area_manager_id       = ?
            OR d.department_manager_id = ?
            OR s.shift_manager_id      = ?
            OR e.employee_manager_id   = ?`,
        [userId, userId, userId, userId, employeeId]
    );

    return rows.map((row) => row.employee_id);
};

const canAccessEmployee = async (userId, employeeId, targetEmployeeId, role) => {
    if (targetEmployeeId === employeeId) {
        return true;
    }

    if (PRIVILEGED_ROLES.includes(role)) {
        return true;
    }

    const [rows] = await pool.execute(
        `SELECT 1
         FROM Employees e
         LEFT JOIN UserGroups  g ON g.user_group_id       = e.employee_user_group_id
         LEFT JOIN Areas       a ON a.area_id             = g.user_group_area_id
         LEFT JOIN Departments d ON d.department_id       = g.user_group_department_id
         LEFT JOIN Shifts      s ON s.shift_id            = g.user_group_shift_id
         WHERE e.employee_id = ?
           AND (g.user_group_manager_id = ?
                OR a.area_manager_id       = ?
                OR d.department_manager_id = ?
                OR s.shift_manager_id      = ?
                OR e.employee_manager_id   = ?)
         LIMIT 1`,
        [targetEmployeeId, userId, userId, userId, userId, employeeId]
    );

    return rows.length > 0;
};

module.exports = { getAccessibleEmployeeIds, canAccessEmployee };