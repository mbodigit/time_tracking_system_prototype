const pool = require('../config/db');

const PRIVILEGED_ROLES = ['Admin', 'HR-Bér'];

const MANAGED_AREAS = `
    WITH RECURSIVE managed_areas AS (
        SELECT area_id
        FROM Areas
        WHERE area_manager_id = ?
        UNION ALL
        SELECT a.area_id
        FROM Areas a
        JOIN managed_areas m ON m.area_id = a.area_parent_id
    )
`;

const getAccessibleEmployeeIds = async (userId, employeeId, role) => {
    if (PRIVILEGED_ROLES.includes(role)) {
        const [all] = await pool.execute(`SELECT employee_id FROM Employees`);
        return all.map((row) => row.employee_id);
    }

    const [rows] = await pool.execute(
        `${MANAGED_AREAS}
         SELECT e.employee_id
         FROM Employees e
         LEFT JOIN UserGroups  g ON g.user_group_id       = e.employee_user_group_id
         LEFT JOIN Departments d ON d.department_id       = g.user_group_department_id
         LEFT JOIN Shifts      s ON s.shift_id            = g.user_group_shift_id
         WHERE g.user_group_manager_id = ?
            OR g.user_group_area_id IN (SELECT area_id FROM managed_areas)
            OR d.department_manager_id = ?
            OR s.shift_manager_id      = ?
            OR e.employee_manager_id   = ?`,
        [userId, userId, userId, userId, employeeId]
    );

    return rows.map((row) => row.employee_id);
};

const getAccessibleGroups = async (userId, employeeId, role) => {
    if (PRIVILEGED_ROLES.includes(role)) {
        const [all] = await pool.execute(
            `SELECT user_group_id, user_group_name
             FROM UserGroups
             ORDER BY user_group_name`
        );

        return all;
    }

    const [rows] = await pool.execute(
        `${MANAGED_AREAS}
         SELECT g.user_group_id, g.user_group_name
         FROM UserGroups  g
         LEFT JOIN Departments d ON d.department_id = g.user_group_department_id
         LEFT JOIN Shifts      s ON s.shift_id      = g.user_group_shift_id
         WHERE g.user_group_manager_id = ?
            OR g.user_group_area_id IN (SELECT area_id FROM managed_areas)
            OR d.department_manager_id = ?
            OR s.shift_manager_id      = ?
            OR g.user_group_id IN (
                 SELECT e.employee_user_group_id
                 FROM Employees e
                 WHERE e.employee_manager_id = ?
               )
         ORDER BY g.user_group_name`,
        [userId, userId, userId, userId, employeeId]
    );

    return rows;
};

const canAccessEmployee = async (userId, employeeId, targetEmployeeId, role) => {
    if (targetEmployeeId === employeeId) {
        return true;
    }

    if (PRIVILEGED_ROLES.includes(role)) {
        return true;
    }

    const [rows] = await pool.execute(
        `${MANAGED_AREAS}
         SELECT 1
         FROM Employees e
         LEFT JOIN UserGroups  g ON g.user_group_id       = e.employee_user_group_id
         LEFT JOIN Departments d ON d.department_id       = g.user_group_department_id
         LEFT JOIN Shifts      s ON s.shift_id            = g.user_group_shift_id
         WHERE e.employee_id = ?
           AND (g.user_group_manager_id = ?
                OR g.user_group_area_id IN (SELECT area_id FROM managed_areas)
                OR d.department_manager_id = ?
                OR s.shift_manager_id      = ?
                OR e.employee_manager_id   = ?)
         LIMIT 1`,
        [userId, targetEmployeeId, userId, userId, userId, employeeId]
    );

    return rows.length > 0;
};

module.exports = {
    getAccessibleEmployeeIds,
    getAccessibleGroups,
    canAccessEmployee
};