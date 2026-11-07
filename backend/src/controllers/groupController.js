const pool = require('../config/db');
const { coreHourLength } = require('../services/dateHelpers');

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
            `SELECT core_hour_id, core_hour_name, core_hour_start, core_hour_end
             FROM CoreHours ORDER BY core_hour_start`
        );
        const [managers] = await pool.execute(
            `SELECT u.user_id, u.user_username, e.employee_id,
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
                name: row.working_hour_name || `${row.working_hour_num} óra`,
                num: row.working_hour_num
            })),
            coreHours: coreHours.map((row) => ({
                id: row.core_hour_id,
                name: row.core_hour_name,
                hours: coreHourLength(row.core_hour_start, row.core_hour_end)
            })),
            managers: managers.map((row) => ({
                id: row.user_id,
                employeeId: row.employee_id,
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

const NODE_MANAGER_QUERY = {
    shift: 'SELECT shift_manager_id AS manager_id FROM Shifts WHERE shift_id = ?',
    department:
        'SELECT department_manager_id AS manager_id FROM Departments WHERE department_id = ?',
    area: 'SELECT area_manager_id AS manager_id FROM Areas WHERE area_id = ?'
};

const AREA_CHAIN_MANAGER = `
    WITH RECURSIVE lanc AS (
        SELECT area_id, area_parent_id, area_manager_id, 0 AS szint
        FROM Areas
        WHERE area_id = ?
        UNION ALL
        SELECT a.area_id, a.area_parent_id, a.area_manager_id, l.szint + 1
        FROM Areas a
        JOIN lanc l ON a.area_id = l.area_parent_id
    )
    SELECT area_manager_id AS manager_id
    FROM lanc
    WHERE area_manager_id IS NOT NULL
    ORDER BY szint
    LIMIT 1
`;

const resolveManagerId = async (body) => {
    for (const type of ['shift', 'department']) {
        const id = Number(type === 'shift' ? body.shiftId : body.departmentId);

        if (!id) {
            continue;
        }

        const [rows] = await pool.execute(NODE_MANAGER_QUERY[type], [id]);

        if (rows.length === 0) {
            return { error: `A kiválasztott ${NODE_LABEL[type]} nem található.` };
        }

        if (rows[0].manager_id) {
            return { managerId: rows[0].manager_id };
        }
    }

    const areaId = Number(body.areaId);

    const [areas] = await pool.execute(
        'SELECT area_id FROM Areas WHERE area_id = ?', [areaId]
    );

    if (areas.length === 0) {
        return { error: 'A kiválasztott terület nem található.' };
    }

    const [chain] = await pool.execute(AREA_CHAIN_MANAGER, [areaId]);

    return { managerId: chain.length > 0 ? chain[0].manager_id : null };
};

const NODE_LABEL = {
    shift: 'műszak',
    department: 'részleg',
    area: 'terület'
};

const findGroupOnNode = async (body, groupId) => {
    const [rows] = await pool.execute(
        `SELECT user_group_name
         FROM UserGroups
         WHERE user_group_area_id       <=> ?
           AND user_group_department_id <=> ?
           AND user_group_shift_id      <=> ?
           AND user_group_id            <>  ?
         LIMIT 1`,
        [
            Number(body.areaId) || null,
            Number(body.departmentId) || null,
            Number(body.shiftId) || null,
            groupId || 0
        ]
    );

    return rows[0] || null;
};

const prepare = async (body, groupId) => {
    if (!String(body.name || '').trim()) {
        return { error: 'A csoport megnevezése kötelező.' };
    }

    if (!Number(body.areaId)) {
        return { error: 'A terület megadása kötelező.' };
    }

    if (!Number(body.costCenterId)) {
        return { error: 'A költséghely megadása kötelező.' };
    }

    if (Number(body.shiftId) && !Number(body.departmentId)) {
        return { error: 'Műszak csak részleg megadása mellett vehető fel.' };
    }

    const resolved = await resolveManagerId(body);

    if (resolved.error) {
        return { error: resolved.error };
    }

    const managerId = resolved.managerId;

    if (!managerId) {
        return {
            error: 'A kiválasztott szervezeti egységnek és a fában fölötte lévő '
                + 'egységeknek sincs vezetője. A csoport vezetője a szervezeti '
                + 'egység vezetőjétől öröklődik, ezért előbb valahol a láncban '
                + 'vezetőt kell megadni.'
        };
    }

    const [managers] = await pool.execute(
        `SELECT u.user_status, r.user_role_name
         FROM Users u
         JOIN UserRoles r ON r.user_role_id = u.user_role_id
         WHERE u.user_id = ?`,
        [managerId]
    );

    if (managers.length === 0 || !managers[0].user_status) {
        return {
            error: 'A szervezeti egység vezetőjének aktív rendszerfelhasználónak kell lennie.'
        };
    }

    if (managers[0].user_role_name !== 'Vezető') {
        return {
            error: 'A szervezeti egység vezetőjének vezetői szerepkörrel kell rendelkeznie.'
        };
    }

    const existing = await findGroupOnNode(body, groupId);

    if (existing) {
        return {
            error: 'Ehhez a szervezeti egységhez már tartozik csoport: '
                + `${existing.user_group_name}. Egy szervezeti egységhez `
                + 'egy csoport tartozhat.'
        };
    }

    return { managerId };
};

const toValues = (body, managerId) => ([
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
    managerId
]);

const create = async (req, res) => {
    const body = req.body || {};
    const prepared = await prepare(body, 0);

    if (prepared.error) {
        return res.status(400).json({ message: prepared.error });
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
            toValues(body, prepared.managerId)
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

    const prepared = await prepare(body, groupId);

    if (prepared.error) {
        return res.status(400).json({ message: prepared.error });
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
            [...toValues(body, prepared.managerId), groupId]
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
             JOIN EmployeeSettings es         ON es.employee_id            = e.employee_id
             LEFT JOIN WorkSchedules w        ON w.work_schedule_id        = es.employee_setting_work_schedule_id
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