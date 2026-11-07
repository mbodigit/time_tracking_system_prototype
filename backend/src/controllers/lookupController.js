const pool = require('../config/db');
const { getAccessibleEmployeeIds, canAccessEmployee } = require('../services/employeeScope');

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
                    e.employee_last_name, e.employee_first_name,
                    w.work_schedule_name
             FROM Employees e
             JOIN EmployeeSettings s ON s.employee_id = e.employee_id
             LEFT JOIN WorkSchedules w ON w.work_schedule_id = s.employee_setting_work_schedule_id
             WHERE e.employee_id IN (${placeholders})
             ORDER BY e.employee_last_name, e.employee_first_name`,
            ids
        );

        return res.status(200).json({
            employees: rows.map((row) => ({
                id: row.employee_id,
                code: row.employee_code,
                name: `${row.employee_last_name} ${row.employee_first_name}`,
                workSchedule: row.work_schedule_name,
                isSelf: row.employee_id === req.user.employeeId
            }))
        });
    } catch (error) {
        console.error('Dolgozói lista hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
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
                return res.status(403).json({ message: 'Ehhez a dolgozóhoz nincs hozzáférése.' });
            }
        }

        const [rows] = await pool.execute(
            `SELECT a.absence_id, a.absence_name, a.absence_is_paid,
                    a.absence_category, a.absence_is_open_ended
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
                category: row.absence_category,
                isOpenEnded: Boolean(row.absence_is_open_ended)
            }))
        });
    } catch (error) {
        console.error('Jogcímlista hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { listEmployees, listAbsences };