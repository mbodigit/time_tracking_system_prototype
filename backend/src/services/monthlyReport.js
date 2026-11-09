const pool = require('../config/db');
const { loadRotationSlots, resolveRotation } = require('./shiftRotation');
const { calculateAllowances } = require('./allowanceCalculator');
const {
    DAY_TYPE_MAP, addDays, toDate, minutesBetween, overlapMinutes
} = require('./dateHelpers');
const { buildLeaveBalance } = require('./leaveBalance');

const buildMonthlyReport = async (employeeId, yearNumber, monthNumber) => {
    const [employees] = await pool.execute(
        `SELECT
            e.employee_break_minutes, e.employee_break_paid,
            e.employee_core_start, e.employee_core_end,
            e.employee_code, e.employee_first_name, e.employee_last_name,
            e.employee_user_group_id,
            e.employee_break_start, e.employee_break_end,
            e.employee_annual_leave_days,
            e.employee_core_hour_id AS own_core_hour_id,
            g.user_group_rotation_position, g.user_group_rotation_start,
            c.core_hour_start, c.core_hour_end,
            w.work_schedule_is_shift, w.work_schedule_name,
            h.working_hour_num,
            g.user_group_name, a.area_name, loc.work_location_name,
            u.user_username, u.user_status
            FROM Employees e
            JOIN EmployeeSettings   s ON s.employee_id = e.employee_id
            LEFT JOIN Users         u ON u.user_employee_id = e.employee_id
            LEFT JOIN CoreHours     c ON c.core_hour_id      = s.employee_setting_core_hour_id
            LEFT JOIN WorkSchedules w ON w.work_schedule_id  = s.employee_setting_work_schedule_id
            LEFT JOIN WorkingHours  h ON h.working_hour_id   = s.employee_setting_working_hour_id
            LEFT JOIN UserGroups    g ON g.user_group_id     = e.employee_user_group_id
            LEFT JOIN WorkLocations loc ON loc.work_location_id = e.employee_work_location_id            
            LEFT JOIN Areas         a ON a.area_id           = g.user_group_area_id
            WHERE e.employee_id = ?`,
        [employeeId]
    );

    if (employees.length === 0) {
        return null;
    }

    const employee = employees[0];
    const templateStart = employee.employee_core_start || employee.core_hour_start;
    const templateEnd = employee.employee_core_end || employee.core_hour_end;

    const hasOwnCoreHours = Boolean(employee.employee_core_start)
        || Boolean(employee.own_core_hour_id);
    const usesRotation = Boolean(employee.work_schedule_is_shift)
        && !hasOwnCoreHours
        && employee.user_group_rotation_position !== null
        && employee.user_group_rotation_position !== undefined;
    const rotationSlots = usesRotation ? await loadRotationSlots() : [];
    const isShiftWorker = Boolean(employee.work_schedule_is_shift);
    const isFlexible = employee.work_schedule_name === 'Kötetlen';

    const employeeProfile = {
        code: employee.employee_code,
        name: `${employee.employee_last_name} ${employee.employee_first_name}`,
        workScheduleName: employee.work_schedule_name,
        workingHourNum: employee.working_hour_num,
        coreStart: templateStart,
        coreEnd: templateEnd,
        breakMinutes: employee.employee_break_minutes,
        breakPaid: Boolean(employee.employee_break_paid),
        breakStart: employee.employee_break_start,
        breakEnd: employee.employee_break_end,
        groupName: employee.user_group_name,
        areaName: employee.area_name,
        workLocationName: employee.work_location_name,
        username: employee.user_username,
        hasAccount: Boolean(employee.user_username),
        accountActive: employee.user_username
            ? Boolean(employee.user_status)
            : null
    };

    const monthPrefix = `${yearNumber}-${String(monthNumber).padStart(2, '0')}`;
    const lastDayNumber = new Date(yearNumber, monthNumber, 0).getDate();
    const firstDay = `${monthPrefix}-01`;
    const lastDay = `${monthPrefix}-${lastDayNumber}`;

    const [rows] = await pool.execute(
        `SELECT
            wtt_id, wtt_working_date, wtt_working_start, wtt_working_end,
            wtt_schedule_start, wtt_schedule_end,
            wtt_brk_start, wtt_brk_end,
            wtt_absence_id, wtt_is_ordered, wtt_note
         FROM WorkingTimeTracking
         WHERE wtt_employee_id = ?
           AND wtt_working_date BETWEEN ? AND ?
         ORDER BY wtt_working_date`,
        [employeeId, firstDay, lastDay]
    );

    const [calendarRows] = await pool.execute(
        `SELECT gl_cal_date, gl_cal_day_type
         FROM GlobalCalendar
         WHERE gl_cal_date BETWEEN ? AND ?`,
        [firstDay, addDays(lastDay, 1)]
    );

    const calendar = {};
    for (const entry of calendarRows) {
        calendar[entry.gl_cal_date] = DAY_TYPE_MAP[entry.gl_cal_day_type] || 'workday';
    }

    const [allowanceRows] = await pool.execute(
        `SELECT allowance_code, allowance_name, allowance_percent, allowance_payroll_code
         FROM Allowances
         WHERE allowance_code IS NOT NULL
         ORDER BY allowance_percent, allowance_name`
    );

    const allowanceTypes = allowanceRows.map((row) => ({
        code: row.allowance_code,
        name: row.allowance_name,
        percent: Number(row.allowance_percent),
        payrollCode: row.allowance_payroll_code
    }));

    const contractedMinutes = (employee.working_hour_num || 0) * 60;

    const [requestRows] = await pool.execute(
        `SELECT r.request_start_date, r.request_end_date, r.request_status,
                a.absence_id, a.absence_name, a.absence_is_paid,
                a.absence_rec_type, a.absence_payroll_code
         FROM Requests r
         JOIN Absences a ON a.absence_id = r.request_absence_id
         WHERE r.request_employee_id = ?
           AND r.request_status IN ('Függőben', 'Jóváhagyva')
           AND r.request_start_date <= ?
           AND r.request_end_date   >= ?`,
        [employeeId, lastDay, firstDay]
    );

    const absenceByDate = {};
    for (const entry of requestRows) {
        let cursor = entry.request_start_date < firstDay
            ? firstDay
            : entry.request_start_date;
        const last = entry.request_end_date > lastDay
            ? lastDay
            : entry.request_end_date;

        while (cursor <= last) {
            const current = absenceByDate[cursor];

            if (!current || entry.request_status === 'Jóváhagyva') {
                absenceByDate[cursor] = entry;
            }

            cursor = addDays(cursor, 1);
        }
    }

    if (isFlexible) {
        const flexibleDays = [];
        const flexibleAbsences = {};
        let flexibleWorkedMinutes = 0;
        let flexibleAbsenceMinutes = 0;
        let workingDayCount = 0;

        for (let dayNumber = 1; dayNumber <= lastDayNumber; dayNumber++) {
            const date = `${monthPrefix}-${String(dayNumber).padStart(2, '0')}`;
            const dayType = calendar[date] || 'workday';
            const weekdayNumber = new Date(`${date}T00:00:00`).getDay();
            const isWorkingDay = dayType === 'transferred'
                || (dayType === 'workday' && weekdayNumber !== 0 && weekdayNumber !== 6);

            const absence = absenceByDate[date];
            const coversDay = Boolean(absence)
                && absence.request_status === 'Jóváhagyva'
                && absence.absence_rec_type === 0
                && isWorkingDay;

            const absenceInfo = absence
                ? {
                    id: absence.absence_id,
                    name: absence.absence_name,
                    isPaid: Boolean(absence.absence_is_paid),
                    status: absence.request_status,
                    coversDay
                  }
                : null;

            if (!isWorkingDay) {
                flexibleDays.push({
                    id: null,
                    date,
                    dayType,
                    workStart: null,
                    workEnd: null,
                    absence: absenceInfo,
                    absenceMinutes: 0,
                    isOrdered: false,
                    presenceMinutes: 0,
                    breakMinutes: 0,
                    scheduledMinutes: null,
                    balanceMinutes: null,
                    workedMinutes: 0,
                    settledMinutes: 0,
                    allowances: {}
                });
                continue;
            }

            workingDayCount++;

            const absenceMinutes = coversDay ? contractedMinutes : 0;
            const workedMinutes = coversDay ? 0 : contractedMinutes;

            flexibleAbsenceMinutes += absenceMinutes;
            flexibleWorkedMinutes += workedMinutes;

            if (absenceMinutes > 0) {
                const name = absence.absence_name;
                const current = flexibleAbsences[name]
                    || { minutes: 0, payrollCode: absence.absence_payroll_code };

                current.minutes += absenceMinutes;
                flexibleAbsences[name] = current;
            }

            flexibleDays.push({
                id: null,
                date,
                dayType,
                workStart: null,
                workEnd: null,
                absence: absenceInfo,
                absenceMinutes,
                isOrdered: false,
                presenceMinutes: 0,
                breakMinutes: 0,
                scheduledMinutes: contractedMinutes,
                balanceMinutes: 0,
                workedMinutes,
                settledMinutes: contractedMinutes,
                allowances: {}
            });
        }

        return {
            employeeId,
            employeeCode: employee.employee_code,
            employeeName: `${employee.employee_last_name} ${employee.employee_first_name}`,
            employeeArea: employee.area_name,
            employeeWorkLocation: employee.work_location_name,
            leave: await buildLeaveBalance(employeeId, yearNumber),            
            employeeProfile,
            year: yearNumber,
            month: monthNumber,
            isFlexible: true,
            allowanceTypes,
            days: flexibleDays,
            summary: {
                recordedDays: 0,
                workedMinutes: flexibleWorkedMinutes,
                presenceMinutes: 0,
                breakMinutes: 0,
                balanceMinutes: 0,
                absenceMinutes: flexibleAbsenceMinutes,
                settledMinutes: flexibleWorkedMinutes + flexibleAbsenceMinutes,
                frameMinutes: contractedMinutes * workingDayCount,
                requiredMinutes: contractedMinutes * workingDayCount,                
                allowances: {},
                absences: flexibleAbsences
            }
        };
    }

    const rowsByDate = {};
    for (const row of rows) {
        rowsByDate[row.wtt_working_date] = row;
    }

    const days = [];
    const summaryAllowances = {};
    const summaryAbsences = {};
    let summaryWorkedMinutes = 0;
    let summaryPresenceMinutes = 0;
    let summaryBreakMinutes = 0;
    let summaryBalanceMinutes = 0;
    let summaryAbsenceMinutes = 0;
    let recordedDays = 0;

    for (let dayNumber = 1; dayNumber <= lastDayNumber; dayNumber++) {
        const date = `${monthPrefix}-${String(dayNumber).padStart(2, '0')}`;
        const dayType = calendar[date] || 'workday';
        const nextDayType = calendar[addDays(date, 1)] || 'workday';
        const row = rowsByDate[date];
        const absence = absenceByDate[date];
        const isApprovedAbsence = Boolean(absence) && absence.request_status === 'Jóváhagyva';
        const weekdayNumber = new Date(`${date}T00:00:00`).getDay();
        const isWorkingDayForAbsence = dayType === 'transferred'
            || (dayType === 'workday' && weekdayNumber !== 0 && weekdayNumber !== 6);

        const absenceMinutes =
            (isApprovedAbsence && absence.absence_rec_type === 0 && isWorkingDayForAbsence)
                ? contractedMinutes
                : 0;

        summaryAbsenceMinutes += absenceMinutes;

        if (absenceMinutes > 0) {
            const name = absence.absence_name;
            const current = summaryAbsences[name]
                || { minutes: 0, payrollCode: absence.absence_payroll_code };

            current.minutes += absenceMinutes;
            summaryAbsences[name] = current;
        }

        const absenceInfo = absence
            ? {
                id: absence.absence_id,
                name: absence.absence_name,
                isPaid: Boolean(absence.absence_is_paid),
                status: absence.request_status,
                coversDay: absenceMinutes > 0
              }
            : null;

        const weekday = new Date(`${date}T00:00:00`).getDay();
        const isWorkingDay = dayType === 'transferred'
            || (dayType === 'workday' && weekday !== 0 && weekday !== 6);

        const rotated = usesRotation
            ? resolveRotation(
                date,
                employee.user_group_rotation_position,
                employee.user_group_rotation_start,
                rotationSlots
              )
            : null;

        const dayStart = rotated ? rotated.start : templateStart;
        const dayEnd = rotated ? rotated.end : templateEnd;

        const defaultScheduleStart = (isWorkingDay && dayStart && dayEnd)
            ? `${date} ${dayStart}`
            : null;
        const defaultScheduleEnd = (isWorkingDay && dayStart && dayEnd)
            ? (dayEnd > dayStart ? `${date} ${dayEnd}` : `${addDays(date, 1)} ${dayEnd}`)
            : null;

        if (!row) {
            days.push({
                id: null,
                date,
                dayType,
                workStart: null,
                workEnd: null,
                absence: absenceInfo,
                absenceMinutes,
                isOrdered: false,
                presenceMinutes: 0,
                breakMinutes: 0,
                breakStart: null,
                breakEnd: null,
                scheduleStart: defaultScheduleStart,
                scheduleEnd: defaultScheduleEnd,
                scheduleFromEntry: false,
                scheduledMinutes: null,
                balanceMinutes: absenceMinutes > 0 ? 0 : null,
                workedMinutes: 0,
                settledMinutes: absenceMinutes,
                allowances: {}
            });
            continue;
        }

        recordedDays++;

        if (!row.wtt_working_start || !row.wtt_working_end) {
            days.push({
                id: row.wtt_id,
                date,
                dayType,
                workStart: null,
                workEnd: null,
                absence: absenceInfo,
                absenceMinutes,
                isOrdered: Boolean(row.wtt_is_ordered),
                presenceMinutes: 0,
                breakMinutes: 0,
                breakStart: row.wtt_brk_start,
                breakEnd: row.wtt_brk_end,
                scheduleStart: row.wtt_schedule_start || defaultScheduleStart,
                scheduleEnd: row.wtt_schedule_end || defaultScheduleEnd,
                scheduleFromEntry: Boolean(row.wtt_schedule_start),
                scheduledMinutes: null,
                balanceMinutes: absenceMinutes > 0 ? 0 : null,
                workedMinutes: 0,
                settledMinutes: absenceMinutes,
                allowances: {}
            });
            continue;
        }

        let scheduleStart = row.wtt_schedule_start || defaultScheduleStart;
        let scheduleEnd = row.wtt_schedule_end || defaultScheduleEnd;

        const hasSchedule = Boolean(scheduleStart) && Boolean(scheduleEnd);
        const scheduleMissing = isWorkingDay && !hasSchedule;

        const breakMinutes = (row.wtt_brk_start && row.wtt_brk_end)
            ? overlapMinutes(
                row.wtt_brk_start, row.wtt_brk_end,
                row.wtt_working_start, row.wtt_working_end
              )
            : (hasSchedule ? (employee.employee_break_minutes || 0) : 0);

        const breakDeduction = employee.employee_break_paid ? 0 : breakMinutes;

        const scheduledMinutes = scheduleMissing
            ? null
            : (hasSchedule
                ? minutesBetween(scheduleStart, scheduleEnd) - breakDeduction
                : 0);

        const result = calculateAllowances({
            workStart: toDate(row.wtt_working_start),
            workEnd: toDate(row.wtt_working_end),
            scheduleStart: hasSchedule ? toDate(scheduleStart) : null,
            scheduleEnd: hasSchedule ? toDate(scheduleEnd) : null,
            dayType,
            nextDayType,
            isShiftWorker,
            isOrdered: Boolean(row.wtt_is_ordered),
            breakStart: row.wtt_brk_start ? toDate(row.wtt_brk_start) : null,
            breakEnd: row.wtt_brk_end ? toDate(row.wtt_brk_end) : null,
            breakMinutes,
            breakPaid: Boolean(employee.employee_break_paid)
        });

        const presenceMinutes = minutesBetween(
            row.wtt_working_start, row.wtt_working_end
        );

        const balanceMinutes = scheduledMinutes === null
            ? null
            : (absenceMinutes > 0
                ? 0
                : result.workedMinutes - scheduledMinutes - result.premiumOutsideMinutes);

        summaryWorkedMinutes += result.workedMinutes;
        summaryPresenceMinutes += presenceMinutes;
        summaryBreakMinutes += breakDeduction;
        summaryBalanceMinutes += balanceMinutes || 0;

        for (const [key, value] of Object.entries(result.allowances)) {
            summaryAllowances[key] = (summaryAllowances[key] || 0) + value;
        }

        days.push({
            id: row.wtt_id,
            date,
            dayType,
            workStart: row.wtt_working_start,
            workEnd: row.wtt_working_end,
            absence: absenceInfo,
            absenceMinutes,
            isOrdered: Boolean(row.wtt_is_ordered),
            presenceMinutes,
            breakMinutes: breakDeduction,
            breakStart: row.wtt_brk_start,
            breakEnd: row.wtt_brk_end,
            scheduleStart: hasSchedule ? scheduleStart : null,
            scheduleEnd: hasSchedule ? scheduleEnd : null,
            scheduleFromEntry: Boolean(row.wtt_schedule_start),
            scheduledMinutes,
            balanceMinutes,
            scheduleMissing,
            workedMinutes: result.workedMinutes,
            settledMinutes: result.workedMinutes + absenceMinutes,
            allowances: result.allowances
        });
    }

    return {
        employeeId,
        employeeCode: employee.employee_code,
        employeeName: `${employee.employee_last_name} ${employee.employee_first_name}`,
        employeeGroupId: employee.employee_user_group_id,
        employeeGroup: employee.user_group_name,
        employeeArea: employee.area_name,
        employeeWorkLocation: employee.work_location_name,
        leave: await buildLeaveBalance(employeeId, yearNumber),        
        employeeProfile,
        year: yearNumber,
        month: monthNumber,
        isFlexible: false,
        allowanceTypes,
        days,
        summary: {
            recordedDays,
            workedMinutes: summaryWorkedMinutes,
            presenceMinutes: summaryPresenceMinutes,
            breakMinutes: summaryBreakMinutes,
            balanceMinutes: summaryBalanceMinutes,
            absenceMinutes: summaryAbsenceMinutes,
            settledMinutes: summaryWorkedMinutes + summaryAbsenceMinutes,
            allowances: summaryAllowances,
            requiredMinutes: days.reduce(
                (sum, day) => sum + (day.scheduledMinutes || 0), 0
            ),            
            absences: summaryAbsences
        }
    };
};

module.exports = { buildMonthlyReport };