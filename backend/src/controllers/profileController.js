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

    //ideiglenes
    return res.status(200).json({message: 'A mezők rendben.'});
};

module.exports = { getMe, changePassword };