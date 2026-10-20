const pool = require('../config/db');
const { getAccessibleEmployeeIds } = require('../services/employeeScope');
const { buildMonthlyReport } = require('../services/monthlyReport');

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

    const costCenterId = Number(req.query.costCenterId);

    if (!costCenterId || ids.length === 0) {
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
            ...report.summary
        });
    }

    reportRows.sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'hu'));

    return { reportRows, allowanceTypes };
};

const monthly = async (req, res) => {
    const period = parsePeriod(req.query);

    if (!period) {
        return res.status(400).json({ message: 'Érvényes évet és hónapot kell megadni.' });
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
            allowances: {}
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
        }

        return res.status(200).json({
            year: period.yearNumber,
            month: period.monthNumber,
            allowanceTypes,
            employees: reportRows,
            totals
        });
    } catch (error) {
        console.error('Riport hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const toHours = (minutes) => (minutes / 60).toFixed(2).replace('.', ',');

const payroll = async (req, res) => {
    const period = parsePeriod(req.query);

    if (!period) {
        return res.status(400).json({ message: 'Érvényes évet és hónapot kell megadni.' });
    }

    try {
        const ids = await collectEmployeeIds(req);
        const { reportRows, allowanceTypes } = await buildRows(
            ids, period.yearNumber, period.monthNumber
        );

        const [settings] = await pool.execute(
            `SELECT company_base_payroll_code FROM CompanySettings WHERE company_settings_id = 1`
        );

        const baseCode = (settings.length > 0 && settings[0].company_base_payroll_code)
            ? settings[0].company_base_payroll_code
            : 'ALAP';

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

            for (const [code, minutes] of Object.entries(reportRow.absences || {})) {
                if (minutes > 0) {
                    items.push([code, minutes]);
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
        console.error('Bérfeladási export hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { monthly, payroll };