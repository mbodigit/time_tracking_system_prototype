const pool = require('../config/db');

const DAY_TYPES = [
    'Munkaszüneti nap',
    'Pihenőnap',
    'Áthelyezett pihenőnap',
    'Áthelyezett munkanap'
];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const list = async (req, res) => {
    const yearNumber = Number(req.query.year);

    if (!yearNumber || yearNumber < 2000 || yearNumber > 2100) {
        return res.status(400).json({ message: 'Érvényes évet kell megadni.' });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT gl_cal_id, gl_cal_date, gl_cal_day_type, gl_cal_note
             FROM GlobalCalendar
             WHERE gl_cal_date BETWEEN ? AND ?
             ORDER BY gl_cal_date`,
            [`${yearNumber}-01-01`, `${yearNumber}-12-31`]
        );

        const days = rows.map((row) => ({
            id: row.gl_cal_id,
            date: row.gl_cal_date,
            dayType: row.gl_cal_day_type,
            note: row.gl_cal_note
        }));

        return res.status(200).json({ year: yearNumber, dayTypes: DAY_TYPES, days });
    } catch (error) {
        console.error('Naptár lekérdezési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const save = async (req, res) => {
    const { date, dayType, note } = req.body || {};

    if (!date || !DATE_PATTERN.test(date)) {
        return res.status(400).json({ message: 'A dátum formátuma érvénytelen.' });
    }

    if (!DAY_TYPES.includes(dayType)) {
        return res.status(400).json({ message: 'Érvénytelen naptípus.' });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO GlobalCalendar (gl_cal_date, gl_cal_day_type, gl_cal_note)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                gl_cal_day_type = VALUES(gl_cal_day_type),
                gl_cal_note     = VALUES(gl_cal_note)`,
            [date, dayType, note || null]
        );

        return res.status(200).json({
            message: result.affectedRows > 1
                ? 'A naptári nap módosításra került.'
                : 'A naptári nap rögzítésre került.'
        });
    } catch (error) {
        console.error('Naptár rögzítési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const remove = async (req, res) => {
    const { date } = req.params;

    if (!date || !DATE_PATTERN.test(date)) {
        return res.status(400).json({ message: 'A dátum formátuma érvénytelen.' });
    }

    try {
        const [result] = await pool.execute(
            `DELETE FROM GlobalCalendar WHERE gl_cal_date = ?`,
            [date]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Erre a napra nincs naptári bejegyzés.' });
        }

        return res.status(200).json({ message: 'A naptári nap törlésre került.' });
    } catch (error) {
        console.error('Naptár törlési hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { list, save, remove };