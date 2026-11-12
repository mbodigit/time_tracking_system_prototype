const MILLISEC_PER_MINUTE = 60 * 1000;

const SUNDAY = 0;
const SATURDAY = 6;

const isWithinHourRange = (hour, range) => {
    if (!range) {
        return false;
    }

    const { startHour, endHour } = range;

    if (startHour === endHour) {
        return true;
    }

    return startHour < endHour
        ? (hour >= startHour && hour < endHour)
        : (hour >= startHour || hour < endHour);
};

const getAllowanceKey = (
    minute, referenceDay, dayType, isShiftWorker, isWithinSchedule, isOrdered,
    shiftPremiumRange
) => {
    const weekday = referenceDay.getDay();
    const isTransferredWorkday = dayType === 'transferred';

    if (dayType === 'holiday')                       return 'munkaszuneti';
    if (!isTransferredWorkday && weekday === SUNDAY) return 'vasarnap';
    if (!isTransferredWorkday && weekday === SATURDAY) return 'szombat';
    if (dayType === 'restday')                       return 'pihenonap';

    if (isWithinSchedule) {
        if (!isShiftWorker) return null;

        return isWithinHourRange(minute.getHours(), shiftPremiumRange)
            ? 'muszak'
            : null;
    }

    return isOrdered ? 'tulora' : null;
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
        breakStart,
        breakEnd,
        breakMinutes,
        breakPaid,
        shiftPremiumRange
    } = input;

    const allowances = {};
    let presenceMinutes = 0;
    let premiumOutsideMinutes = 0;

    const startDay = workStart.getDate();
    const hasSchedule = Boolean(scheduleStart) && Boolean(scheduleEnd);
    const hasBreakWindow = Boolean(breakStart) && Boolean(breakEnd) && !breakPaid;

    for (let time = workStart.getTime(); time < workEnd.getTime(); time += MILLISEC_PER_MINUTE) {
        if (hasBreakWindow
            && time >= breakStart.getTime()
            && time < breakEnd.getTime()) {
            continue;
        }
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
            isShiftWorker, isWithinSchedule, Boolean(isOrdered),
            shiftPremiumRange
        );

        if (key) {
            allowances[key] = (allowances[key] || 0) + 1;
            if (!isWithinSchedule) {
                premiumOutsideMinutes++;
            }
        }
    }

    const deduction = (breakPaid || hasBreakWindow) ? 0 : (breakMinutes || 0);

    return {
        workedMinutes: presenceMinutes - deduction,
        premiumOutsideMinutes,
        allowances
    };
};

module.exports = { calculateAllowances, getAllowanceKey };