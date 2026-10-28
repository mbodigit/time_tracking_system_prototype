const pool = require('../config/db');

const ENTITIES = {
    areas: {
        table: 'Areas',
        idColumn: 'area_id',
        nameColumn: 'area_name',
        managerColumn: 'area_manager_id',
        parentColumn: 'area_parent_id',
        parentRequired: false,
        selfParent: true,
        label: 'terület'
    },
    departments: {
        table: 'Departments',
        idColumn: 'department_id',
        nameColumn: 'department_name',
        managerColumn: 'department_manager_id',
        parentColumn: 'department_area_id',
        parentRequired: true,
        selfParent: false,
        label: 'részleg'
    },
    shifts: {
        table: 'Shifts',
        idColumn: 'shift_id',
        nameColumn: 'shift_name',
        managerColumn: 'shift_manager_id',
        parentColumn: 'shift_department_id',
        parentRequired: true,
        selfParent: false,
        label: 'műszak'
    }
};

const isDescendant = async (entity, rootId, candidateId) => {
    const [rows] = await pool.execute(
        `WITH RECURSIVE sub AS (
            SELECT ${entity.idColumn} AS id
            FROM ${entity.table}
            WHERE ${entity.idColumn} = ?
            UNION ALL
            SELECT t.${entity.idColumn}
            FROM ${entity.table} t
            JOIN sub s ON s.id = t.${entity.parentColumn}
         )
         SELECT 1 FROM sub WHERE id = ? LIMIT 1`,
        [rootId, candidateId]
    );

    return rows.length > 0;
};

const managerName = (row) => {
    if (!row.manager_user_id) {
        return null;
    }
    return row.employee_last_name
        ? `${row.employee_last_name} ${row.employee_first_name}`
        : row.user_username;
};

const tree = async (req, res) => {
    try {
        const [areaRows] = await pool.execute(
            `SELECT a.area_id, a.area_name, a.area_parent_id,
                    a.area_manager_id AS manager_user_id,
                    u.user_username, e.employee_last_name, e.employee_first_name
             FROM Areas a
             LEFT JOIN Users u     ON u.user_id     = a.area_manager_id
             LEFT JOIN Employees e ON e.employee_id = u.user_employee_id
             ORDER BY a.area_name`
        );

        const [departmentRows] = await pool.execute(
            `SELECT d.department_id, d.department_name, d.department_area_id,
                    d.department_manager_id AS manager_user_id,
                    u.user_username, e.employee_last_name, e.employee_first_name
             FROM Departments d
             LEFT JOIN Users u     ON u.user_id     = d.department_manager_id
             LEFT JOIN Employees e ON e.employee_id = u.user_employee_id
             ORDER BY d.department_name`
        );

        const [shiftRows] = await pool.execute(
            `SELECT s.shift_id, s.shift_name, s.shift_department_id,
                    s.shift_manager_id AS manager_user_id,
                    u.user_username, e.employee_last_name, e.employee_first_name
             FROM Shifts s
             LEFT JOIN Users u     ON u.user_id     = s.shift_manager_id
             LEFT JOIN Employees e ON e.employee_id = u.user_employee_id
             ORDER BY s.shift_name`
        );

        const [managerRows] = await pool.execute(
            `SELECT u.user_id, u.user_username,
                    e.employee_last_name, e.employee_first_name
             FROM Users u
             LEFT JOIN Employees e ON e.employee_id = u.user_employee_id
             WHERE u.user_status = 1
             ORDER BY e.employee_last_name, e.employee_first_name`
        );

        const shifts = shiftRows.map((row) => ({
            id: row.shift_id,
            name: row.shift_name,
            departmentId: row.shift_department_id,
            managerId: row.manager_user_id,
            managerName: managerName(row)
        }));

        const departments = departmentRows.map((row) => ({
            id: row.department_id,
            name: row.department_name,
            areaId: row.department_area_id,
            managerId: row.manager_user_id,
            managerName: managerName(row),
            shifts: shifts.filter((item) => item.departmentId === row.department_id)
        }));

        const areas = areaRows.map((row) => ({
            id: row.area_id,
            name: row.area_name,
            parentId: row.area_parent_id,
            managerId: row.manager_user_id,
            managerName: managerName(row),
            departments: departments.filter((item) => item.areaId === row.area_id)
        }));

        const managers = managerRows.map((row) => ({
            id: row.user_id,
            name: row.employee_last_name
                ? `${row.employee_last_name} ${row.employee_first_name}`
                : row.user_username
        }));

        return res.status(200).json({ areas, managers });
    } catch (error) {
        console.error('Szervezet lekérdezési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const resolveEntity = (req, res) => {
    const entity = ENTITIES[req.params.entity];

    if (!entity) {
        res.status(400).json({ message: 'Ismeretlen szervezeti egység.' });
        return null;
    }

    return entity;
};

const create = async (req, res) => {
    const entity = resolveEntity(req, res);

    if (!entity) {
        return;
    }

    const name = String(req.body?.name || '').trim();
    const parentId = Number(req.body?.parentId) || null;
    const managerId = Number(req.body?.managerId) || null;

    if (!name) {
        return res.status(400).json({ message: 'A megnevezés kötelező.' });
    }

    if (entity.parentRequired && !parentId) {
        return res.status(400).json({
            message: 'A felettes szervezeti egység megadása kötelező.'
        });
    }

    try {
        const columns = [entity.nameColumn, entity.managerColumn];
        const values = [name, managerId];

        if (entity.parentColumn) {
            columns.push(entity.parentColumn);
            values.push(parentId);
        }

        const placeholders = columns.map(() => '?').join(', ');

        const [result] = await pool.execute(
            `INSERT INTO ${entity.table} (${columns.join(', ')})
             VALUES (${placeholders})`,
            values
        );

        return res.status(201).json({
            message: `Az új ${entity.label} létrehozásra került.`,
            id: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: `Ilyen nevű ${entity.label} már létezik ezen a szinten.`
            });
        }

        console.error('Szervezet létrehozási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const update = async (req, res) => {
    const entity = resolveEntity(req, res);

    if (!entity) {
        return;
    }

    const id = Number(req.params.id);
    const name = String(req.body?.name || '').trim();
    const managerId = Number(req.body?.managerId) || null;
    const hasParent = Object.prototype.hasOwnProperty.call(
        req.body || {}, 'parentId'
    );
    const parentId = hasParent ? (Number(req.body.parentId) || null) : null;

    if (!id) {
        return res.status(400).json({ message: 'Érvénytelen azonosító.' });
    }

    if (!name) {
        return res.status(400).json({ message: 'A megnevezés kötelező.' });
    }

    if (hasParent && entity.parentRequired && !parentId) {
        return res.status(400).json({
            message: 'A felettes szervezeti egység megadása kötelező.'
        });
    }

    try {
        if (hasParent && entity.selfParent && parentId) {
            if (parentId === id) {
                return res.status(409).json({
                    message: `A ${entity.label} nem lehet önmaga felettese.`
                });
            }

            if (await isDescendant(entity, id, parentId)) {
                return res.status(409).json({
                    message: `A ${entity.label} nem rendelhető a saját `
                        + 'leszármazottja alá, mert azzal kör keletkezne a '
                        + 'szervezeti felépítésben.'
                });
            }
        }

        const assignments = [
            `${entity.nameColumn} = ?`,
            `${entity.managerColumn} = ?`
        ];
        const values = [name, managerId];

        if (hasParent && entity.parentColumn) {
            assignments.push(`${entity.parentColumn} = ?`);
            values.push(parentId);
        }

        const [result] = await pool.execute(
            `UPDATE ${entity.table}
             SET ${assignments.join(', ')}
             WHERE ${entity.idColumn} = ?`,
            [...values, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'A szervezeti egység nem található.' });
        }

        return res.status(200).json({
            message: `A ${entity.label} módosításra került.`
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: `Ilyen nevű ${entity.label} már létezik ezen a szinten.`
            });
        }

        console.error('Szervezet módosítási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const remove = async (req, res) => {
    const entity = resolveEntity(req, res);

    if (!entity) {
        return;
    }

    const id = Number(req.params.id);

    if (!id) {
        return res.status(400).json({ message: 'Érvénytelen azonosító.' });
    }

    try {
        const [result] = await pool.execute(
            `DELETE FROM ${entity.table} WHERE ${entity.idColumn} = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'A szervezeti egység nem található.' });
        }

        return res.status(200).json({
            message: `A ${entity.label} törlésre került.`
        });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                message: `A ${entity.label} nem törölhető, amíg alárendelt egység vagy csoport tartozik hozzá.`
            });
        }

        console.error('Szervezet törlési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { tree, create, update, remove };