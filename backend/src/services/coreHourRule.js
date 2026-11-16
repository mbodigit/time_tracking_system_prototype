const pool = require('../config/db');
const { coreHourLength } = require('../utils/dateHelpers');

const coreHourMismatch = async (workingHourId, coreHourId) => {
    if (!workingHourId || !coreHourId) {
        return null;
    }

    const [rows] = await pool.execute(
        `SELECT h.working_hour_num, c.core_hour_name,
                c.core_hour_start, c.core_hour_end
         FROM WorkingHours h
         JOIN CoreHours    c ON c.core_hour_id = ?
         WHERE h.working_hour_id = ?`,
        [coreHourId, workingHourId]
    );

    if (rows.length === 0) {
        return null;
    }

    const required = Number(rows[0].working_hour_num);
    const actual = coreHourLength(rows[0].core_hour_start, rows[0].core_hour_end);

    if (actual === required) {
        return null;
    }

    return `A ${rows[0].core_hour_name} törzsidő hossza ${actual} óra, `
        + `a beállított napi munkaidő viszont ${required} óra. `
        + 'A törzsidő hossza csak a napi munkaidővel megegyező lehet, '
        + 'különben a napi ledolgozandó óraszám hibás lenne.';
};

const groupWorkingHourId = async (groupId) => {
    if (!groupId) {
        return null;
    }

    const [rows] = await pool.execute(
        `SELECT user_group_working_hour_id FROM UserGroups
         WHERE user_group_id = ?`,
        [groupId]
    );

    return rows[0]?.user_group_working_hour_id ?? null;
};

module.exports = { coreHourMismatch, groupWorkingHourId };
