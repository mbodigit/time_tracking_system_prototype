const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const getMe = (req, res) => {
    return res.status(200).json({ user: req.user });
};

const changePassword = async (req, res) => {
    const {currentPassword, newPassword} = req.body;

    if (!currentPassword || !newPassword){
        return res.status(400).json({message: 'A jelenlegi és az új jelszó megadása is kötelező.'})
    }

    if (newPassword.length < 8){
        return res.status(400).json({message: 'Az új jelszónak legalább 8 karakter hosszúnak kell lennie.'})
    }

    const [rows] = await pool.execute(
        `
        SELECT user_password_hash
        FROM Users
        WHERE user_id = ?
        `, [req.user.userId]
    );

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, rows[0].user_password_hash);
    if (!isCurrentPasswordValid){
        return res.status(401).json({message: "A jelenlegi jelszó helytelen."});
    }

    //ideiglenes
    return res.status(200).json({message: 'A jelenlegi jelszó helyes.'});
};

module.exports = { getMe, changePassword };