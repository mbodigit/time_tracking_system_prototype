const pool = require('../config/db');

const nearestAreaManager = (areas) => {
    const byId = new Map(areas.map((area) => [area.area_id, area]));
    const resolved = new Map();

    const walk = (areaId, seen) => {
        if (resolved.has(areaId)) {
            return resolved.get(areaId);
        }

        const area = byId.get(areaId);

        if (!area || seen.has(areaId)) {
            return null;
        }

        seen.add(areaId);

        const managerId = area.area_manager_id
            ? area.area_manager_id
            : (area.area_parent_id ? walk(area.area_parent_id, seen) : null);

        resolved.set(areaId, managerId);
        return managerId;
    };

    for (const area of areas) {
        walk(area.area_id, new Set());
    }

    return resolved;
};

const syncGroupManagers = async () => {
    const [areas] = await pool.execute(
        'SELECT area_id, area_parent_id, area_manager_id FROM Areas'
    );

    const areaManagers = nearestAreaManager(areas);

    const [groups] = await pool.execute(
        `SELECT g.user_group_id, g.user_group_area_id, g.user_group_manager_id,
                s.shift_manager_id, d.department_manager_id
         FROM UserGroups g
         LEFT JOIN Shifts      s ON s.shift_id      = g.user_group_shift_id
         LEFT JOIN Departments d ON d.department_id = g.user_group_department_id`
    );

    let updated = 0;

    for (const group of groups) {
        const effective = group.shift_manager_id
            || group.department_manager_id
            || areaManagers.get(group.user_group_area_id)
            || null;

        if (effective === group.user_group_manager_id) {
            continue;
        }

        await pool.execute(
            `UPDATE UserGroups SET user_group_manager_id = ?
             WHERE user_group_id = ?`,
            [effective, group.user_group_id]
        );

        updated += 1;
    }

    return updated;
};

module.exports = { syncGroupManagers };
