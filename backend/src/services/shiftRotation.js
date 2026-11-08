const pool = require('../config/db');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toIsoDate = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'string') {
        return value.slice(0, 10);
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const mondayOf = (isoDate) => {
    const date = new Date(`${isoDate}T00:00:00Z`);
    const weekday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - weekday);
    return date;
};

const weekIndex = (isoDate, cycleStart) => Math.round(
    (mondayOf(isoDate).getTime() - mondayOf(cycleStart).getTime()) / (7 * MS_PER_DAY)
);

const resolveRotation = (isoDate, position, cycleStart, slots) => {
    const start = toIsoDate(cycleStart);

    if (position === null || position === undefined || !start
        || !Array.isArray(slots) || slots.length === 0) {
        return null;
    }

    const index = weekIndex(isoDate, start) + Number(position);
    const slot = slots[((index % slots.length) + slots.length) % slots.length];

    return { start: slot.start, end: slot.end };
};

const loadRotationSlots = async () => {
    const [rows] = await pool.execute(
        `SELECT c.core_hour_start, c.core_hour_end
         FROM ShiftRotations r
         JOIN CoreHours c ON c.core_hour_id = r.shift_rotation_core_hour_id
         ORDER BY r.shift_rotation_position`
    );

    return rows.map((row) => ({
        start: row.core_hour_start,
        end: row.core_hour_end
    }));
};

module.exports = { loadRotationSlots, resolveRotation, weekIndex };
