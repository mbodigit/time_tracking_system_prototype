const pool = require('../config/db');

const USED_CODE_IDS = `
    SELECT absence_payroll_code_id AS payroll_code_id
    FROM Absences
    WHERE absence_payroll_code_id IS NOT NULL
    UNION
    SELECT allowance_payroll_code_id
    FROM Allowances
    WHERE allowance_payroll_code_id IS NOT NULL
`;

const listSelectableCodes = async (keepCodeId = null) => {
    const [rows] = await pool.execute(
        `SELECT payroll_code_id, payroll_code, payroll_code_name
         FROM PayrollCodes
         WHERE payroll_code_is_base = 0
           AND (payroll_code_id NOT IN (${USED_CODE_IDS}) OR payroll_code_id = ?)
         ORDER BY payroll_code`,
        [keepCodeId]
    );

    return rows.map((row) => ({
        id: row.payroll_code_id,
        code: row.payroll_code,
        name: row.payroll_code_name
    }));
};

const codeError = async (codeId, keepCodeId = null) => {
    if (!codeId) {
        return null;
    }

    const [rows] = await pool.execute(
        `SELECT payroll_code_is_base,
                (payroll_code_id IN (${USED_CODE_IDS})) AS used
         FROM PayrollCodes
         WHERE payroll_code_id = ?`,
        [codeId]
    );

    if (rows.length === 0) {
        return 'A megadott bérkód nem létezik.';
    }

    if (rows[0].payroll_code_is_base) {
        return 'A ledolgozott órák bérkódja nem rendelhető jogcímhez vagy pótlékhoz.';
    }

    if (rows[0].used && codeId !== keepCodeId) {
        return 'A megadott bérkód már egy másik jogcímhez vagy pótlékhoz tartozik.';
    }

    return null;
};

const baseCode = async () => {
    const [rows] = await pool.execute(
        `SELECT payroll_code FROM PayrollCodes
         WHERE payroll_code_is_base = 1
         LIMIT 1`
    );

    return rows.length > 0 ? rows[0].payroll_code : null;
};

module.exports = { listSelectableCodes, codeError, baseCode };
