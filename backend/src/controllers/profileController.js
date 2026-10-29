const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'Az új jelszó nem egyezhet meg a jelenlegivel.' });
    }
    
    try {
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

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await pool.execute(
            `
            UPDATE Users
            SET 
                user_password_hash = ?,
                user_must_change_password = 0
            WHERE user_id = ?
            `, [newPasswordHash, req.user.userId]
        );

        const payload = {
            userId: req.user.userId,
            username: req.user.username,
            role: req.user.role,
            employeeId: req.user.employeeId,
            fullName: req.user.fullName,
            mustChangePassword: false
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        return res.status(200).json({
            message: 'A jelszó megváltozott.',
            token,
            user: payload
        });
    }
    catch (error){
        console.error('Jelszócsere hiba:' ,error);
        return res.status(500).json({message: 'Szerver hiba.'})
    }
};

module.exports = { getMe, changePassword };