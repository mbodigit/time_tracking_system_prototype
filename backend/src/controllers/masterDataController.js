const pool = require('../config/db');
const { invalidId, serverError, unknownMasterData } = require('../utils/apiResponse');

const ENTITIES = {
    'work-schedules': {
        permission: 'admin.working_time',
        table: 'WorkSchedules',
        idColumn: 'work_schedule_id',
        orderBy: 'work_schedule_name',
        label: 'munkarend',
        fields: [
            { key: 'name', column: 'work_schedule_name', type: 'text', required: true, max: 30, label: 'megnevezés' },
            { key: 'isShift', column: 'work_schedule_is_shift', type: 'boolean', label: 'műszakos jelölő' }
        ],
        references: [
            { table: 'Employees', column: 'employee_work_schedule_id', label: 'dolgozó' },
            { table: 'UserGroups', column: 'user_group_work_schedule_id', label: 'csoport' },
            { table: 'AbsenceWorkSchedules', column: 'work_schedule_id', label: 'távolléti jogcím' },
            { table: 'WorkScheduleAllowances', column: 'work_schedule_id', label: 'pótlék' }
        ]
    },
    'working-hours': {
        permission: 'admin.working_time',
        table: 'WorkingHours',
        idColumn: 'working_hour_id',
        orderBy: 'working_hour_num',
        label: 'napi munkaidő',
        fields: [
            { key: 'num', column: 'working_hour_num', type: 'integer', required: true, min: 1, max: 12, label: 'óraszám' },
            { key: 'name', column: 'working_hour_name', type: 'text', max: 20, label: 'megnevezés' }
        ],
        references: [
            { table: 'Employees', column: 'employee_working_hour_id', label: 'dolgozó' },
            { table: 'UserGroups', column: 'user_group_working_hour_id', label: 'csoport' }
        ]
    },
    'core-hours': {
        permission: 'admin.core_hours',
        table: 'CoreHours',
        idColumn: 'core_hour_id',
        orderBy: 'core_hour_start',
        label: 'törzsidő',
        fields: [
            { key: 'name', column: 'core_hour_name', type: 'text', required: true, max: 20, label: 'megnevezés' },
            { key: 'start', column: 'core_hour_start', type: 'time', required: true, label: 'kezdete' },
            { key: 'end', column: 'core_hour_end', type: 'time', required: true, label: 'vége' }
        ],
        references: [
            { table: 'Employees', column: 'employee_core_hour_id', label: 'dolgozó' },
            { table: 'UserGroups', column: 'user_group_core_hour_id', label: 'csoport' }
        ]
    },
    'cost-centers': {
        permission: 'admin.cost_centers',
        table: 'CostCenters',
        idColumn: 'cost_center_id',
        orderBy: 'cost_center_name',
        label: 'költséghely',
        fields: [
            { key: 'name', column: 'cost_center_name', type: 'text', required: true, max: 50, label: 'megnevezés' },
            { key: 'code', column: 'cost_center_code', type: 'text', required: true, max: 10, label: 'kód' }
        ],
        references: [
            { table: 'Employees', column: 'employee_cost_center_id', label: 'dolgozó' },
            { table: 'UserGroups', column: 'user_group_cost_center_id', label: 'csoport' }
        ]
    },
    'work-locations': {
        permission: 'admin.company',
        table: 'WorkLocations',
        idColumn: 'work_location_id',
        orderBy: 'work_location_name',
        label: 'telephely',
        fields: [
            { key: 'name', column: 'work_location_name', type: 'text', required: true, max: 100, label: 'megnevezés' },
            { key: 'code', column: 'work_location_code', type: 'text', max: 10, label: 'kód' },
            { key: 'country', column: 'work_location_country', type: 'text', max: 100, label: 'ország' },
            { key: 'postalCode', column: 'work_location_postal_code', type: 'text', max: 10, label: 'irányítószám' },
            { key: 'city', column: 'work_location_city', type: 'text', max: 100, label: 'település' },
            { key: 'address', column: 'work_location_address', type: 'text', max: 150, label: 'cím' }
        ],
        references: [
            { table: 'Employees', column: 'employee_work_location_id', label: 'dolgozó' }
        ]
    }
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const resolveEntity = (name) => ENTITIES[name] || null;

const readValues = (entity, body) => {
    const values = [];

    for (const field of entity.fields) {
        const raw = body ? body[field.key] : undefined;

        if (field.type === 'boolean') {
            values.push(raw ? 1 : 0);
            continue;
        }

        if (field.type === 'integer') {
            const num = Number(raw);

            if (!Number.isInteger(num)) {
                return { error: `A(z) ${field.label} csak egész szám lehet.` };
            }

            if (num < field.min || num > field.max) {
                return {
                    error: `A(z) ${field.label} értéke ${field.min} és `
                        + `${field.max} között lehet.`
                };
            }

            values.push(num);
            continue;
        }

        if (field.type === 'time') {
            const text = String(raw || '').trim();

            if (!TIME_PATTERN.test(text)) {
                return { error: `A(z) ${field.label} megadása óra:perc alakban kötelező.` };
            }

            values.push(text.length === 5 ? `${text}:00` : text);
            continue;
        }

        const text = String(raw || '').trim();

        if (field.required && !text) {
            return { error: `A(z) ${field.label} megadása kötelező.` };
        }

        if (text.length > field.max) {
            return { error: `A(z) ${field.label} legfeljebb ${field.max} karakter lehet.` };
        }

        values.push(text || null);
    }

    return { values };
};

const list = async (req, res) => {
    const entity = resolveEntity(req.params.entity);

    if (!entity) {
        return unknownMasterData(res);
    }

    try {
        const columns = entity.fields.map((field) => field.column).join(', ');

        const [rows] = await pool.execute(
            `SELECT ${entity.idColumn}, ${columns}
             FROM ${entity.table}
             ORDER BY ${entity.orderBy}`
        );

        const items = rows.map((row) => {
            const item = { id: row[entity.idColumn] };

            for (const field of entity.fields) {
                const value = row[field.column];

                item[field.key] = field.type === 'boolean'
                    ? Boolean(value)
                    : value;
            }

            return item;
        });

        return res.status(200).json({ items });
    } catch (error) {
        return serverError(res, 'Törzsadat lekérdezési hiba', error);
    }
};

const create = async (req, res) => {
    const entity = resolveEntity(req.params.entity);

    if (!entity) {
        return unknownMasterData(res);
    }

    const parsed = readValues(entity, req.body);

    if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
    }

    try {
        const columns = entity.fields.map((field) => field.column);
        const placeholders = columns.map(() => '?').join(', ');

        const [result] = await pool.execute(
            `INSERT INTO ${entity.table} (${columns.join(', ')})
             VALUES (${placeholders})`,
            parsed.values
        );

        return res.status(201).json({
            message: `Az új ${entity.label} létrehozásra került.`,
            id: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: `Ilyen ${entity.label} már létezik.`
            });
        }

        return serverError(res, 'Törzsadat létrehozási hiba', error);
    }
};

const update = async (req, res) => {
    const entity = resolveEntity(req.params.entity);

    if (!entity) {
        return unknownMasterData(res);
    }

    const id = Number(req.params.id);

    if (!id) {
        return invalidId(res);
    }

    const parsed = readValues(entity, req.body);

    if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
    }

    try {
        const assignments = entity.fields
            .map((field) => `${field.column} = ?`)
            .join(', ');

        const [result] = await pool.execute(
            `UPDATE ${entity.table} SET ${assignments}
             WHERE ${entity.idColumn} = ?`,
            [...parsed.values, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'A törzsadat nem található.' });
        }

        return res.status(200).json({
            message: `A ${entity.label} módosításra került.`
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: `Ilyen ${entity.label} már létezik.`
            });
        }

        return serverError(res, 'Törzsadat módosítási hiba', error);
    }
};

const remove = async (req, res) => {
    const entity = resolveEntity(req.params.entity);

    if (!entity) {
        return unknownMasterData(res);
    }

    const id = Number(req.params.id);

    if (!id) {
        return invalidId(res);
    }

    try {
        const counts = entity.references
            .map((ref) => `(SELECT COUNT(*) FROM ${ref.table} WHERE ${ref.column} = ?)`)
            .join(', ');

        const [rows] = await pool.execute(
            `SELECT ${counts}`,
            entity.references.map(() => id)
        );

        const values = Object.values(rows[0]);

        const reasons = entity.references
            .map((ref, index) => ({
                label: ref.label,
                count: Number(values[index])
            }))
            .filter((item) => item.count > 0)
            .map((item) => `${item.count} ${item.label}`);

        if (reasons.length > 0) {
            return res.status(409).json({
                message: `A ${entity.label} nem törölhető, mert hivatkozik rá: `
                    + `${reasons.join(', ')}. Előbb a hivatkozásokat kell megszüntetni.`
            });
        }

        const [result] = await pool.execute(
            `DELETE FROM ${entity.table} WHERE ${entity.idColumn} = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'A törzsadat nem található.' });
        }

        return res.status(200).json({
            message: `A ${entity.label} törlésre került.`
        });
    } catch (error) {
        return serverError(res, 'Törzsadat törlési hiba', error);
    }
};

module.exports = { ENTITIES, resolveEntity, list, create, update, remove };