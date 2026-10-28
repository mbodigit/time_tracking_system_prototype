const DAY_TYPE_MAP = {
    'Munkaszüneti nap': 'holiday',
    'Pihenőnap': 'restday',
    'Munkanap': 'transferred'
};

const toSqlDateTime = (value) => String(value).replace('T', ' ').slice(0, 19);

const daysSince = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(dateString);
    day.setHours(0, 0, 0, 0);
    return Math.round((today - day) / (1000 * 60 * 60 * 24));
};

const addDays = (dateString, count) => {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + count);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toDate = (value) => new Date(String(value).replace(' ', 'T'));

const minutesBetween = (from, to) => Math.round((toDate(to) - toDate(from)) / (1000 * 60));

const overlapMinutes = (fromA, toA, fromB, toB) => {
    const start = Math.max(toDate(fromA).getTime(), toDate(fromB).getTime());
    const end = Math.min(toDate(toA).getTime(), toDate(toB).getTime());
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
    toDate,
    minutesBetween,
    overlapMinutes,
    coreHourLength
};