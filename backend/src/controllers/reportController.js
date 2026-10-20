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
    const sorok = [];
    let allowanceTypes = [];

    for (const id of ids) {
        const report = await buildMonthlyReport(id, yearNumber, monthNumber);

        if (!report) {
            continue;
        }

        allowanceTypes = report.allowanceTypes;

        sorok.push({
            employeeId: report.employeeId,
            employeeCode: report.employeeCode,
            employeeName: report.employeeName,
            ...report.summary
        });
    }

    sorok.sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'hu'));

    return { sorok, allowanceTypes };
};

const monthly = async (req, res) => {
    const period = parsePeriod(req.query);

    if (!period) {
        return res.status(400).json({ message: 'Érvényes évet és hónapot kell megadni.' });
    }

    try {
        const ids = await collectEmployeeIds(req);
        const { sorok, allowanceTypes } = await buildRows(
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

        for (const sor of sorok) {
            totals.workedMinutes += sor.workedMinutes;
            totals.presenceMinutes += sor.presenceMinutes;
            totals.breakMinutes += sor.breakMinutes;
            totals.balanceMinutes += sor.balanceMinutes;
            totals.absenceMinutes += sor.absenceMinutes;
            totals.settledMinutes += sor.settledMinutes;

            for (const [kulcs, ertek] of Object.entries(sor.allowances)) {
                totals.allowances[kulcs] = (totals.allowances[kulcs] || 0) + ertek;
            }
        }

        return res.status(200).json({
            year: period.yearNumber,
            month: period.monthNumber,
            allowanceTypes,
            employees: sorok,
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
        const { sorok, allowanceTypes } = await buildRows(
            ids, period.yearNumber, period.monthNumber
        );

        const [settings] = await pool.execute(
            `SELECT company_base_payroll_code FROM CompanySettings WHERE company_settings_id = 1`
        );

        const alapKod = (settings.length > 0 && settings[0].company_base_payroll_code)
            ? settings[0].company_base_payroll_code
            : 'ALAP';

        const berkodByCode = {};
        for (const tipus of allowanceTypes) {
            berkodByCode[tipus.code] = tipus.payrollCode || tipus.code;
        }

        const idoszak = `${period.yearNumber}-${String(period.monthNumber).padStart(2, '0')}`;
        const kimenet = ['dolgozo_kod;nev;idoszak;berkod;oraszam'];

        for (const sor of sorok) {
            const tetelek = [];

            if (sor.workedMinutes > 0) {
                tetelek.push([alapKod, sor.workedMinutes]);
            }

            for (const tipus of allowanceTypes) {
                const percek = sor.allowances[tipus.code] || 0;
                if (percek > 0) {
                    tetelek.push([berkodByCode[tipus.code], percek]);
                }
            }

            for (const [kod, percek] of Object.entries(sor.absences || {})) {
                if (percek > 0) {
                    tetelek.push([kod, percek]);
                }
            }

            for (const [kod, percek] of tetelek) {
                kimenet.push(
                    `${sor.employeeCode};${sor.employeeName};${idoszak};${kod};${toHours(percek)}`
                );
            }
        }

        const fajlnev = `berfeladas_${period.yearNumber}_${String(period.monthNumber).padStart(2, '0')}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fajlnev}"`);

        return res.status(200).send(`\uFEFF${kimenet.join('\r\n')}\r\n`);
    } catch (error) {
        console.error('Bérfeladási export hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { monthly, payroll };