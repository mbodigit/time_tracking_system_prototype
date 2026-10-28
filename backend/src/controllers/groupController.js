const pool = require('../config/db');

const list = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT g.user_group_id, g.user_group_name, g.user_group_status,
                    g.user_group_description,
                    g.user_group_area_id, a.area_name,
                    g.user_group_department_id, d.department_name,
                    g.user_group_shift_id, s.shift_name,
                    g.user_group_cost_center_id, c.cost_center_name,
                    g.user_group_work_schedule_id, w.work_schedule_name,
                    g.user_group_working_hour_id, h.working_hour_num,
                    g.user_group_core_hour_id, ch.core_hour_name,
                    g.user_group_manager_id, u.user_username,
                    m.employee_last_name, m.employee_first_name,
                    (SELECT COUNT(*)
                       FROM Employees emp
                       JOIN EmployeeStatus st
                         ON st.employee_status_id = emp.employee_status_id
                      WHERE emp.employee_user_group_id = g.user_group_id
                        AND st.employee_status_is_active = 1) AS active_employees
             FROM UserGroups g
             LEFT JOIN Areas        a  ON a.area_id            = g.user_group_area_id
             LEFT JOIN Departments  d  ON d.department_id      = g.user_group_department_id
             LEFT JOIN Shifts       s  ON s.shift_id           = g.user_group_shift_id
             LEFT JOIN CostCenters  c  ON c.cost_center_id     = g.user_group_cost_center_id
             LEFT JOIN WorkSchedules w ON w.work_schedule_id   = g.user_group_work_schedule_id
             LEFT JOIN WorkingHours h  ON h.working_hour_id    = g.user_group_working_hour_id
             LEFT JOIN CoreHours    ch ON ch.core_hour_id      = g.user_group_core_hour_id
             LEFT JOIN Users        u  ON u.user_id            = g.user_group_manager_id
             LEFT JOIN Employees    m  ON m.employee_id        = u.user_employee_id
             ORDER BY a.area_name, g.user_group_name`
        );

        const groups = rows.map((row) => ({
            id: row.user_group_id,
            name: row.user_group_name,
            status: row.user_group_status,
            description: row.user_group_description,
            areaId: row.user_group_area_id,
            areaName: row.area_name,
            departmentId: row.user_group_department_id,
            departmentName: row.department_name,
            shiftId: row.user_group_shift_id,
            shiftName: row.shift_name,
            costCenterId: row.user_group_cost_center_id,
            costCenterName: row.cost_center_name,
            workScheduleId: row.user_group_work_schedule_id,
            workScheduleName: row.work_schedule_name,
            workingHourId: row.user_group_working_hour_id,
            workingHourNum: row.working_hour_num,
            coreHourId: row.user_group_core_hour_id,
            coreHourName: row.core_hour_name,
            managerId: row.user_group_manager_id,
            managerName: row.employee_last_name
                ? `${row.employee_last_name} ${row.employee_first_name}`
                : row.user_username,
            activeEmployees: row.active_employees
        }));

        return res.status(200).json({ groups });
    } catch (error) {
        console.error('Csoport lekérdezési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const options = async (req, res) => {
    try {
        const [areas] = await pool.execute(
            `SELECT area_id, area_name FROM Areas ORDER BY area_name`
        );
        const [departments] = await pool.execute(
            `SELECT department_id, department_name, department_area_id
             FROM Departments ORDER BY department_name`
        );
        const [shifts] = await pool.execute(
            `SELECT shift_id, shift_name, shift_department_id
             FROM Shifts ORDER BY shift_name`
        );
        const [costCenters] = await pool.execute(
            `SELECT cost_center_id, cost_center_name, cost_center_code
             FROM CostCenters ORDER BY cost_center_name`
        );
        const [workSchedules] = await pool.execute(
            `SELECT work_schedule_id, work_schedule_name
             FROM WorkSchedules ORDER BY work_schedule_name`
        );
        const [workingHours] = await pool.execute(
            `SELECT working_hour_id, working_hour_num, working_hour_name
             FROM WorkingHours ORDER BY working_hour_num`
        );
        const [coreHours] = await pool.execute(
            `SELECT core_hour_id, core_hour_name FROM CoreHours ORDER BY core_hour_start`
        );
        const [managers] = await pool.execute(
            `SELECT u.user_id, u.user_username,
                    e.employee_last_name, e.employee_first_name
             FROM Users u
             JOIN UserRoles r      ON r.user_role_id   = u.user_role_id
             LEFT JOIN Employees e ON e.employee_id    = u.user_employee_id
             WHERE u.user_status = 1
               AND r.user_role_name = 'Vezető'
             ORDER BY e.employee_last_name, e.employee_first_name`
        );

        return res.status(200).json({
            areas: areas.map((row) => ({ id: row.area_id, name: row.area_name })),
            departments: departments.map((row) => ({
                id: row.department_id,
                name: row.department_name,
                areaId: row.department_area_id
            })),
            shifts: shifts.map((row) => ({
                id: row.shift_id,
                name: row.shift_name,
                departmentId: row.shift_department_id
            })),
            costCenters: costCenters.map((row) => ({
                id: row.cost_center_id,
                name: `${row.cost_center_name} (${row.cost_center_code})`
            })),
            workSchedules: workSchedules.map((row) => ({
                id: row.work_schedule_id,
                name: row.work_schedule_name
            })),
            workingHours: workingHours.map((row) => ({
                id: row.working_hour_id,
                name: row.working_hour_name || `${row.working_hour_num} óra`
            })),
            coreHours: coreHours.map((row) => ({
                id: row.core_hour_id,
                name: row.core_hour_name
            })),
            managers: managers.map((row) => ({
                id: row.user_id,
                name: row.employee_last_name
                    ? `${row.employee_last_name} ${row.employee_first_name}`
                    : row.user_username
            }))
        });
    } catch (error) {
        console.error('Csoport törzsadat hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const validate = async (body) => {
    const name = String(body.name || '').trim();

    if (!name) {
        return 'A csoport megnevezése kötelező.';
    }

    if (!Number(body.areaId)) {
        return 'A terület megadása kötelező.';
    }

    if (!Number(body.costCenterId)) {
        return 'A költséghely megadása kötelező.';
    }

    if (!Number(body.managerId)) {
        return 'A csoporthoz kötelezően tartozik vezető.';
    }

    if (Number(body.shiftId) && !Number(body.departmentId)) {
        return 'Műszak csak részleg megadása mellett vehető fel.';
    }

    const [managers] = await pool.execute(
        `SELECT u.user_status, r.user_role_name
         FROM Users u
         JOIN UserRoles r ON r.user_role_id = u.user_role_id
         WHERE u.user_id = ?`,
        [Number(body.managerId)]
    );

    if (managers.length === 0 || !managers[0].user_status) {
        return 'A csoport vezetőjének aktív rendszerfelhasználónak kell lennie.';
    }

    if (managers[0].user_role_name !== 'Vezető') {
        return 'A csoport vezetőjének vezetői szerepkörrel kell rendelkeznie.';
    }

    return null;
};

const toValues = (body) => ([
    String(body.name).trim(),
    body.status || 'Aktív',
    body.description || null,
    Number(body.areaId),
    Number(body.departmentId) || null,
    Number(body.shiftId) || null,
    Number(body.costCenterId),
    Number(body.workScheduleId) || null,
    Number(body.workingHourId) || null,
    Number(body.coreHourId) || null,
    Number(body.managerId)
]);

const create = async (req, res) => {
    const body = req.body || {};
    const validationError = await validate(body);

    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO UserGroups (
                user_group_name, user_group_status, user_group_description,
                user_group_area_id, user_group_department_id, user_group_shift_id,
                user_group_cost_center_id, user_group_work_schedule_id,
                user_group_working_hour_id, user_group_core_hour_id,
                user_group_manager_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            toValues(body)
        );

        return res.status(201).json({
            message: 'A csoport létrehozásra került.',
            id: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                message: 'A részleg vagy a műszak nem a kiválasztott szervezeti egységhez tartozik.'
            });
        }

        console.error('Csoport létrehozási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const update = async (req, res) => {
    const groupId = Number(req.params.id);
    const body = req.body || {};

    if (!groupId) {
        return res.status(400).json({ message: 'Érvénytelen csoportazonosító.' });
    }

    const validationError = await validate(body);

    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE UserGroups SET
                user_group_name = ?, user_group_status = ?, user_group_description = ?,
                user_group_area_id = ?, user_group_department_id = ?, user_group_shift_id = ?,
                user_group_cost_center_id = ?, user_group_work_schedule_id = ?,
                user_group_working_hour_id = ?, user_group_core_hour_id = ?,
                user_group_manager_id = ?
             WHERE user_group_id = ?`,
            [...toValues(body), groupId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'A csoport nem található.' });
        }

        return res.status(200).json({ message: 'A csoport módosításra került.' });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                message: 'A részleg vagy a műszak nem a kiválasztott szervezeti egységhez tartozik.'
            });
        }

        console.error('Csoport módosítási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const listAssignable = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT e.employee_id, e.employee_code,
                    e.employee_last_name, e.employee_first_name,
                    e.employee_user_group_id, g.user_group_name,
                    cat.employee_category_name, w.work_schedule_name
             FROM Employees e
             JOIN EmployeeStatus st           ON st.employee_status_id     = e.employee_status_id
             LEFT JOIN UserGroups g           ON g.user_group_id           = e.employee_user_group_id
             LEFT JOIN EmployeeCategories cat ON cat.employee_category_id  = e.employee_category_id
             LEFT JOIN WorkSchedules w        ON w.work_schedule_id        = e.employee_work_schedule_id
             WHERE st.employee_status_is_active = 1
             ORDER BY e.employee_last_name, e.employee_first_name`
        );

        return res.status(200).json({
            employees: rows.map((row) => ({
                id: row.employee_id,
                code: row.employee_code,
                name: `${row.employee_last_name} ${row.employee_first_name}`,
                groupId: row.employee_user_group_id,
                groupName: row.user_group_name,
                categoryName: row.employee_category_name,
                workScheduleName: row.work_schedule_name
            }))
        });
    } catch (error) {
        console.error('Csoporttag lista hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const toIdList = (value) => (
    Array.isArray(value)
        ? [...new Set(value.map(Number).filter(Boolean))]
        : []
);

const updateMembers = async (req, res) => {
    const groupId = Number(req.params.id);
    const add = toIdList(req.body?.add);
    const remove = toIdList(req.body?.remove);

    if (!groupId) {
        return res.status(400).json({ message: 'Érvénytelen csoportazonosító.' });
    }

    if (add.length === 0 && remove.length === 0) {
        return res.status(400).json({ message: 'Nincs végrehajtható művelet a kérésben.' });
    }

    try {
        const [groups] = await pool.execute(
            `SELECT user_group_id FROM UserGroups WHERE user_group_id = ?`,
            [groupId]
        );

        if (groups.length === 0) {
            return res.status(404).json({ message: 'A csoport nem található.' });
        }
    } catch (error) {
        console.error('Csoport ellenőrzési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        if (remove.length > 0) {
            const placeholders = remove.map(() => '?').join(', ');
            await connection.execute(
                `UPDATE Employees SET employee_user_group_id = NULL
                 WHERE employee_user_group_id = ?
                   AND employee_id IN (${placeholders})`,
                [groupId, ...remove]
            );
        }

        if (add.length > 0) {
            const placeholders = add.map(() => '?').join(', ');
            await connection.execute(
                `UPDATE Employees SET employee_user_group_id = ?
                 WHERE employee_id IN (${placeholders})`,
                [groupId, ...add]
            );
        }

        await connection.commit();

        return res.status(200).json({
            message: 'A csoport tagsága módosításra került. '
                + `Hozzáadva: ${add.length}, eltávolítva: ${remove.length}.`
        });
    } catch (error) {
        await connection.rollback();
        console.error('Csoporttagság módosítási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    } finally {
        connection.release();
    }
};

const remove = async (req, res) => {
    const groupId = Number(req.params.id);

    if (!groupId) {
        return res.status(400).json({ message: 'Érvénytelen csoportazonosító.' });
    }

    try {
        const [employees] = await pool.execute(
            `SELECT COUNT(*) AS activeCount
             FROM Employees e
             JOIN EmployeeStatus st ON st.employee_status_id = e.employee_status_id
             WHERE e.employee_user_group_id = ?
               AND st.employee_status_is_active = 1`,
            [groupId]
        );

        if (employees[0].activeCount > 0) {
            return res.status(409).json({
                message: 'A csoport nem törölhető, amíg aktív dolgozó tartozik hozzá.'
            });
        }

        const [result] = await pool.execute(
            `DELETE FROM UserGroups WHERE user_group_id = ?`,
            [groupId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'A csoport nem található.' });
        }

        return res.status(200).json({ message: 'A csoport törlésre került.' });
    } catch (error) {
        console.error('Csoport törlési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = {
    list, options, create, update, remove, listAssignable, updateMembers
};