const MILLISEC_PER_MINUTE = 60 * 1000;

const SUNDAY = 0;
const SATURDAY = 6;

const getAllowanceKey = (
    minute, referenceDay, dayType, isShiftWorker, isWithinSchedule, isOrdered
) => {
    const weekday = referenceDay.getDay();

    if (dayType === 'holiday')  return '200';
    if (weekday === SUNDAY)     return '200';
    if (weekday === SATURDAY)   return '100';
    if (dayType === 'restday')  return '100';

    if (isWithinSchedule) {
        if (!isShiftWorker) return null;

        const hour = minute.getHours();
        if (hour >= 22 || hour < 6) return '30';
        if (hour >= 18)             return '15';
        return null;
    }

    return isOrdered ? '50' : null;
};

const calculateAllowances = (input) => {
    const {
        workStart,
        workEnd,
        scheduleStart,
        scheduleEnd,
        dayType,
        nextDayType,
        isShiftWorker,
        isOrdered,
        breakMinutes,
        breakPaid
    } = input;

    const allowances = {};
    let presenceMinutes = 0;
    let premiumOutsideMinutes = 0;

    const startDay = workStart.getDate();
    const hasSchedule = Boolean(scheduleStart) && Boolean(scheduleEnd);

    for (let time = workStart.getTime(); time < workEnd.getTime(); time += MILLISEC_PER_MINUTE) {
        const minute = new Date(time);
        presenceMinutes++;

        const isWithinSchedule =
            hasSchedule &&
            time >= scheduleStart.getTime() &&
            time < scheduleEnd.getTime();

        const effectiveDayType = isWithinSchedule
            ? dayType
            : (minute.getDate() === startDay ? dayType : nextDayType);

        const referenceDay = isWithinSchedule ? scheduleStart : minute;

        const key = getAllowanceKey(
            minute, referenceDay, effectiveDayType,
            isShiftWorker, isWithinSchedule, Boolean(isOrdered)
        );

        if (key) {
            allowances[key] = (allowances[key] || 0) + 1;
            if (!isWithinSchedule) {
                premiumOutsideMinutes++;
            }
        }
    }

    const deduction = breakPaid ? 0 : (breakMinutes || 0);

    return {
        workedMinutes: presenceMinutes - deduction,
        premiumOutsideMinutes,
        allowances
    };
};

module.exports = { calculateAllowances, getAllowanceKey };