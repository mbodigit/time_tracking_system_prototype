const pool = require('../config/db');
const { getAccessibleEmployeeIds } = require('../services/employeeScope');
const { buildMonthlyReport } = require('../services/monthlyReport');
const { invalidYearMonth, serverError } = require('../utils/apiResponse');
const { baseCode: basePayrollCode } = require('../services/payrollCodes');

const parsePeriod = (query) => {
    const yearNumber = Number(query.year);
    const monthNumber = Number(query.month);

    if (!yearNumber || !monthNumber || monthNumber < 1 || monthNumber > 12) {
        return null;
    }

    return { yearNumber, monthNumber };
};

const collectEmployeeIds = async (req) => {
    const ids = await getAccessibleEmployeeIds(
        req.user.userId, req.user.employeeId, req.user.role
    );

    const employeeId = Number(req.query.employeeId);

    if (employeeId) {
        return ids.includes(employeeId) ? [employeeId] : [];
    }

    if (ids.length === 0) {
        return ids;
    }

    const groupId = Number(req.query.groupId);

    if (groupId) {
        const groupPlaceholders = ids.map(() => '?').join(', ');

        const [groupRows] = await pool.execute(
            `SELECT employee_id FROM Employees
             WHERE employee_user_group_id = ?
               AND employee_id IN (${groupPlaceholders})`,
            [groupId, ...ids]
        );

        return groupRows.map((row) => row.employee_id);
    }

    const costCenterId = Number(req.query.costCenterId);

    if (!costCenterId) {
        return ids;
    }

    const placeholders = ids.map(() => '?').join(', ');

    const [rows] = await pool.execute(
        `SELECT employee_id FROM Employees
         WHERE employee_cost_center_id = ?
           AND employee_id IN (${placeholders})`,
        [costCenterId, ...ids]
    );

    return rows.map((row) => row.employee_id);
};

const DIMENSIONS = {
    workSchedule: 'Munkarend',
    category: 'Állománycsoport',
    gender: 'Nem',
    ageGroup: 'Korcsoport',
    area: 'Terület',
    department: 'Részleg',
    shift: 'Műszak',
    group: 'Csoport'
};

const OVERTIME_CODES = ['tulora', 'szombat', 'vasarnap', 'pihenonap', 'munkaszuneti'];
const SHIFT_PREMIUM_CODES = ['muszak'];
const SICK_ABSENCE = 'Betegség';
const VACATION_ABSENCE = 'Fizetett szabadság';
const UNKNOWN_LABEL = 'Nincs megadva';

const ageGroupOf = (birthDate, referenceDate) => {
    if (!birthDate) {
        return UNKNOWN_LABEL;
    }

    const birth = new Date(String(birthDate).slice(0, 10));
    const reference = new Date(referenceDate);
    let age = reference.getFullYear() - birth.getFullYear();

    const hadBirthday =
        reference.getMonth() > birth.getMonth()
        || (reference.getMonth() === birth.getMonth()
            && reference.getDate() >= birth.getDate());

    if (!hadBirthday) {
        age -= 1;
    }

    if (age < 25) return '25 év alatt';
    if (age < 35) return '25-34 év';
    if (age < 45) return '35-44 év';
    if (age < 55) return '45-54 év';
    return '55 év és fölötte';
};

const emptyBucket = (key) => ({
    key,
    headcount: 0,
    workedMinutes: 0,
    absenceMinutes: 0,
    settledMinutes: 0,
    minusMinutes: 0,
    overtimeMinutes: 0,
    shiftPremiumMinutes: 0,
    sickMinutes: 0,
    vacationMinutes: 0
});

const AGE_GROUPS = [
    '25 év alatt', '25-34 év', '35-44 év', '45-54 év', '55 év és fölötte'
];

const GENDERS = ['Férfi', 'Nő'];

const listDimensionValues = async (dimension) => {
    if (dimension === 'ageGroup') {
        return AGE_GROUPS;
    }

    if (dimension === 'gender') {
        return GENDERS;
    }

    if (dimension === 'workSchedule') {
        const [rows] = await pool.execute(
            `SELECT work_schedule_name AS name FROM WorkSchedules
             ORDER BY work_schedule_name`
        );
        return rows.map((row) => row.name);
    }

    if (dimension === 'category') {
        const [rows] = await pool.execute(
            `SELECT employee_category_name AS name FROM EmployeeCategories
             ORDER BY employee_category_name`
        );
        return rows.map((row) => row.name);
    }

    return [];
};

const buildRows = async (ids, yearNumber, monthNumber) => {
    const reportRows = [];
    let allowanceTypes = [];

    for (const id of ids) {
        const report = await buildMonthlyReport(id, yearNumber, monthNumber);

        if (!report) {
            continue;
        }

        allowanceTypes = report.allowanceTypes;

        reportRows.push({
            employeeId: report.employeeId,
            employeeCode: report.employeeCode,
            employeeName: report.employeeName,
            employeeGroupId: report.employeeGroupId,
            employeeGroup: report.employeeGroup,
            employeeArea: report.employeeArea,
            ...report.summary
        });
    }

    reportRows.sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'hu'));

    return { reportRows, allowanceTypes };
};

const monthly = async (req, res) => {
    const period = parsePeriod(req.query);

    if (!period) {
        return invalidYearMonth(res);
    }

    try {
        const ids = await collectEmployeeIds(req);
        const { reportRows, allowanceTypes } = await buildRows(
            ids, period.yearNumber, period.monthNumber
        );

        const totals = {
            workedMinutes: 0,
            presenceMinutes: 0,
            breakMinutes: 0,
            balanceMinutes: 0,
            absenceMinutes: 0,
            settledMinutes: 0,
            allowances: {},
            absences: {}
        };

        for (const reportRow of reportRows) {
            totals.workedMinutes += reportRow.workedMinutes;
            totals.presenceMinutes += reportRow.presenceMinutes;
            totals.breakMinutes += reportRow.breakMinutes;
            totals.balanceMinutes += reportRow.balanceMinutes;
            totals.absenceMinutes += reportRow.absenceMinutes;
            totals.settledMinutes += reportRow.settledMinutes;

            for (const [code, minutes] of Object.entries(reportRow.allowances)) {
                totals.allowances[code] = (totals.allowances[code] || 0) + minutes;
            }

            for (const [name, absence] of Object.entries(reportRow.absences || {})) {
                totals.absences[name] = (totals.absences[name] || 0) + absence.minutes;
            }
        }

        return res.status(200).json({
            year: period.yearNumber,
            month: period.monthNumber,
            allowanceTypes,
            employees: reportRows,
            totals
        });
    } catch (error) {
        return serverError(res, 'Riport hiba', error);
    }
};

const toHours = (minutes) => (minutes / 60).toFixed(2).replace('.', ',');

const payroll = async (req, res) => {
    const period = parsePeriod(req.query);

    if (!period) {
        return invalidYearMonth(res);
    }

    try {
        const ids = await collectEmployeeIds(req);
        const { reportRows, allowanceTypes } = await buildRows(
            ids, period.yearNumber, period.monthNumber
        );

        const baseCode = await basePayrollCode();

        if (!baseCode) {
            return res.status(409).json({
                message: 'Nincs megjelölve a ledolgozott órák bérkódja, '
                    + 'ezért a bérfeladási fájl nem állítható elő.'
            });
        }

        const payrollCodeByAllowance = {};
        for (const allowanceType of allowanceTypes) {
            payrollCodeByAllowance[allowanceType.code] =
                allowanceType.payrollCode || allowanceType.code;
        }

        const periodLabel = `${period.yearNumber}-${String(period.monthNumber).padStart(2, '0')}`;
        const lines = ['dolgozo_kod;nev;idoszak;berkod;oraszam'];

        for (const reportRow of reportRows) {
            const items = [];

            if (reportRow.workedMinutes > 0) {
                items.push([baseCode, reportRow.workedMinutes]);
            }

            for (const allowanceType of allowanceTypes) {
                const minutes = reportRow.allowances[allowanceType.code] || 0;
                if (minutes > 0) {
                    items.push([payrollCodeByAllowance[allowanceType.code], minutes]);
                }
            }

            for (const [name, absence] of Object.entries(reportRow.absences || {})) {
                if (absence.minutes > 0) {
                    items.push([absence.payrollCode || name, absence.minutes]);
                }
            }

            for (const [code, minutes] of items) {
                lines.push(
                    `${reportRow.employeeCode};${reportRow.employeeName};${periodLabel};${code};${toHours(minutes)}`
                );
            }
        }

        const fileName = `berfeladas_${period.yearNumber}_${String(period.monthNumber).padStart(2, '0')}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        return res.status(200).send(`\uFEFF${lines.join('\r\n')}\r\n`);
    } catch (error) {
        return serverError(res, 'Bérfeladási export hiba', error);
    }
};

const statistics = async (req, res) => {
    const period = parsePeriod(req.query);

    if (!period) {
        return invalidYearMonth(res);
    }

    const dimension = String(req.query.dimension || 'workSchedule');

    if (!DIMENSIONS[dimension]) {
        return res.status(400).json({ message: 'Ismeretlen bontás.' });
    }

    try {
        const ids = await collectEmployeeIds(req);

        if (ids.length === 0) {
            return res.status(200).json({
                year: period.yearNumber,
                month: period.monthNumber,
                dimension,
                dimensions: DIMENSIONS,
                rows: []
            });
        }

        const placeholders = ids.map(() => '?').join(', ');

        const [attributeRows] = await pool.execute(
            `SELECT e.employee_id, e.employee_gender, e.employee_birth_date,
                    w.work_schedule_name, c.employee_category_name,
                    g.user_group_name, a.area_name, d.department_name, s.shift_name
             FROM Employees e
             JOIN EmployeeSettings        es ON es.employee_id         = e.employee_id
             LEFT JOIN WorkSchedules      w ON w.work_schedule_id      = es.employee_setting_work_schedule_id
             LEFT JOIN EmployeeCategories c ON c.employee_category_id  = e.employee_category_id
             LEFT JOIN UserGroups         g ON g.user_group_id         = e.employee_user_group_id
             LEFT JOIN Areas              a ON a.area_id               = g.user_group_area_id
             LEFT JOIN Departments        d ON d.department_id         = g.user_group_department_id
             LEFT JOIN Shifts             s ON s.shift_id              = g.user_group_shift_id
             WHERE e.employee_id IN (${placeholders})`,
            ids
        );

        const referenceDate =
            `${period.yearNumber}-${String(period.monthNumber).padStart(2, '0')}-01`;

        const attributes = {};
        for (const row of attributeRows) {
            attributes[row.employee_id] = {
                workSchedule: row.work_schedule_name || UNKNOWN_LABEL,
                category: row.employee_category_name || UNKNOWN_LABEL,
                gender: row.employee_gender || UNKNOWN_LABEL,
                ageGroup: ageGroupOf(row.employee_birth_date, referenceDate),
                area: row.area_name || UNKNOWN_LABEL,
                department: row.department_name || UNKNOWN_LABEL,
                shift: row.shift_name || UNKNOWN_LABEL,
                group: row.user_group_name || UNKNOWN_LABEL
            };
        }

        const buckets = {};

        for (const id of ids) {
            const report = await buildMonthlyReport(
                id, period.yearNumber, period.monthNumber
            );

            if (!report) {
                continue;
            }

            const key = attributes[id]?.[dimension] || UNKNOWN_LABEL;

            if (!buckets[key]) {
                buckets[key] = emptyBucket(key);
            }

            const bucket = buckets[key];
            bucket.headcount += 1;
            bucket.workedMinutes += report.summary.workedMinutes;
            bucket.absenceMinutes += report.summary.absenceMinutes;
            bucket.settledMinutes += report.summary.settledMinutes;

            for (const day of report.days) {
                if (day.balanceMinutes && day.balanceMinutes < 0) {
                    bucket.minusMinutes += day.balanceMinutes;
                }
            }

            for (const [code, minutes] of Object.entries(report.summary.allowances)) {
                if (OVERTIME_CODES.includes(code)) {
                    bucket.overtimeMinutes += minutes;
                }
                if (SHIFT_PREMIUM_CODES.includes(code)) {
                    bucket.shiftPremiumMinutes += minutes;
                }
            }

            const absences = report.summary.absences || {};
            bucket.sickMinutes += absences[SICK_ABSENCE]?.minutes || 0;
            bucket.vacationMinutes += absences[VACATION_ABSENCE]?.minutes || 0;
        }

        for (const value of await listDimensionValues(dimension)) {
            if (!buckets[value]) {
                buckets[value] = emptyBucket(value);
            }
        }

        const rows = Object.values(buckets)
            .sort((a, b) => a.key.localeCompare(b.key, 'hu'));

        return res.status(200).json({
            year: period.yearNumber,
            month: period.monthNumber,
            dimension,
            dimensions: DIMENSIONS,
            rows
        });
    } catch (error) {
        return serverError(res, 'Statisztika hiba', error);
    }
};

module.exports = { monthly, payroll, statistics };