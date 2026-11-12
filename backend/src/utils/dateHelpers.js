const DAY_TYPE_MAP = {
    'Munkaszüneti nap': 'holiday',
    'Pihenőnap': 'restday',
    'Áthelyezett pihenőnap': 'restday',
    'Áthelyezett munkanap': 'transferred'
};

const toSqlDateTime = (value) => String(value).replace('T', ' ').slice(0, 19);

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const daysSince = (dateString) => Math.round(
    (today() - startOfDay(dateString)) / MS_PER_DAY
);

const addDays = (dateString, count) => {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + count);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

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

const parseDateTime = (value) => new Date(String(value).replace(' ', 'T'));

const startOfDay = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00`);

const today = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const WEEKEND_WEEKDAYS = [0, 6];

const isWeekend = (isoDate) => WEEKEND_WEEKDAYS.includes(
    startOfDay(isoDate).getDay()
);

const isWorkingDay = (isoDate, dayType) => {
    if (dayType === 'transferred') {
        return true;
    }

    if (dayType !== 'workday') {
        return false;
    }

    return !isWeekend(isoDate);
};

const minutesBetween = (from, to) => Math.round(
    (parseDateTime(to) - parseDateTime(from)) / (1000 * 60)
);

const hoursBetween = (from, to) => (to.getTime() - from.getTime()) / (1000 * 60 * 60);

const overlapMinutes = (fromA, toA, fromB, toB) => {
    const start = Math.max(parseDateTime(fromA).getTime(), parseDateTime(fromB).getTime());
    const end = Math.min(parseDateTime(toA).getTime(), parseDateTime(toB).getTime());
    return end > start ? Math.round((end - start) / (1000 * 60)) : 0;
};

const coreHourLength = (start, end) => {
    const toMinutes = (value) => {
        const [hours, minutes] = String(value).split(':').map(Number);
        return (hours * 60) + minutes;
    };

    const diff = toMinutes(end) - toMinutes(start);

    return (diff > 0 ? diff : diff + (24 * 60)) / 60;
};

module.exports = {
    DAY_TYPE_MAP,
    toSqlDateTime,
    daysSince,
    addDays,
    isIsoDate,
    toIsoDate,
    parseDateTime,
    startOfDay,
    today,
    isWeekend,
    isWorkingDay,
    minutesBetween,
    hoursBetween,
    overlapMinutes,
    coreHourLength
};