const pool = require('../config/db');
const { serverError } = require('../utils/apiResponse');

const SETTINGS_ID = 1;

const FIELDS = [
    { key: 'name', column: 'company_name', max: 150, label: 'cégnév', required: true },
    { key: 'address', column: 'company_address', max: 255, label: 'székhely' },
    { key: 'taxNumber', column: 'company_tax_number', max: 20, label: 'adószám' }
];

const toOutput = (row) => ({
    name: row.company_name,
    address: row.company_address,
    taxNumber: row.company_tax_number
});

const readValues = (body) => {
    const values = [];

    for (const field of FIELDS) {
        const text = String(body?.[field.key] ?? '').trim();

        if (field.required && !text) {
            return { error: `A(z) ${field.label} megadása kötelező.` };
        }

        if (text.length > field.max) {
            return {
                error: `A(z) ${field.label} legfeljebb ${field.max} karakter lehet.`
            };
        }

        values.push(text || null);
    }

    return { values };
};

const get = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT company_name, company_address, company_tax_number
             FROM CompanySettings
             WHERE company_settings_id = ?`,
            [SETTINGS_ID]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'A cégadatok nem érhetők el.' });
        }

        return res.status(200).json({ company: toOutput(rows[0]) });
    } catch (error) {
        return serverError(res, 'Cégadat lekérdezési hiba', error);
    }
};

const update = async (req, res) => {
    const { values, error } = readValues(req.body);

    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const assignments = FIELDS.map((field) => `${field.column} = ?`).join(', ');

        const [result] = await pool.execute(
            `UPDATE CompanySettings SET ${assignments} WHERE company_settings_id = ?`,
            [...values, SETTINGS_ID]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'A cégadatok nem érhetők el.' });
        }

        return res.status(200).json({ message: 'A cégadatok mentésre kerültek.' });
    } catch (error) {
        return serverError(res, 'Cégadat mentési hiba', error);
    }
};

module.exports = { get, update };
