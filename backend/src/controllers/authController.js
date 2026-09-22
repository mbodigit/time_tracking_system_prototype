const pool = require('../config/db');
const bcrypt = require ("bcryptjs");
const jwt = require ('jsonwebtoken');

const login = async (req, res) => { 
    const {username, password} = req.body;

    if (!username || !password) {
        return res.status(400).json({message: 'Kérem adjon meg egy érvényes felhasználónevet és jelszót!'});
    }

    const [userQueryRows] = await pool.execute(
        `SELECT 
            u.user_id, u.user_username, u.user_password_hash, u.user_status, u.user_must_change_password,
            r.user_role_name,
            e.employee_id, e.employee_first_name, e.employee_last_name,
            s.employee_status_is_active
        FROM Users u
        JOIN Employees e ON e.employee_id = u.user_employee_id
        JOIN UserRoles r ON r.user_role_id = u.user_role_id
        JOIN EmployeeStatus s ON s.employee_status_id = e.employee_status_id
        WHERE u.user_username = ?`, [username]
        );
    if (userQueryRows.length === 0){
        return res.status(401).json({message: 'Hibás felhasználónév vagy jelszó!'});
    }

    //ideiglenes
    return res.status(200).json({
        talalat: userQueryRows.length,
        felhasznalo: userQueryRows[0].user_username,
        szerepkor: userQueryRows[0].user_role_name,
        nev: userQueryRows[0].employee_last_name + ' ' + userQueryRows[0].employee_first_name,
        jogviszony_aktiv: userQueryRows[0].employee_status_is_active
    })

}
module.exports = {login};