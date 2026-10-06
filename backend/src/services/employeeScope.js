const pool = require('../config/db');

const getAccessibleEmployeeIds = async (userId, employeeId) => {
    const [rows] = await pool.execute(
        `SELECT e.employee_id
         FROM Employees e
         LEFT JOIN UserGroups g ON g.user_group_id = e.employee_user_group_id
         WHERE g.user_group_manager_id = ?
            OR e.employee_manager_id   = ?`,
        [userId, employeeId]
    );

    return rows.map((row) => row.employee_id);
};

const canAccessEmployee = async (userId, employeeId, targetEmployeeId) => {
    if (targetEmployeeId === employeeId) {
        return true;
    }

    const [rows] = await pool.execute(
        `SELECT 1
         FROM Employees e
         LEFT JOIN UserGroups g ON g.user_group_id = e.employee_user_group_id
         WHERE e.employee_id = ?
           AND (g.user_group_manager_id = ? OR e.employee_manager_id = ?)
         LIMIT 1`,
        [targetEmployeeId, userId, employeeId]
    );

    return rows.length > 0;
};

module.exports = { getAccessibleEmployeeIds, canAccessEmployee };