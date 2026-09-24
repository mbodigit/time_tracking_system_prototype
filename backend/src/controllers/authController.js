const pool = require('../config/db');
const bcrypt = require ("bcryptjs");
const jwt = require ('jsonwebtoken');

const login = async (req, res) => { 
    const {username, password} = req.body;

    if (!username || !password) {
        return res.status(400).json({message: 'Kérem adjon meg egy érvényes felhasználónevet és jelszót!'});
    }

    try{
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

        const user = userQueryRows[0];

        const isPasswordValid = await bcrypt.compare(password, user.user_password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({message: 'Hibás felhasználónév vagy jelszó!'});
        }

        if (!user.employee_status_is_active){
            return res.status(403).json({message: 'A dolgozó státusza inaktív! Kérem forduljon a HR osztályhoz.'})
        }

        if (!user.user_status){
            return res.status(403).json({message: 'A felhasználó státusza inaktív! Kérem forduljon az IT osztályhoz.'})
        }

        const payload = {
            userId: user.user_id,
            username: user.user_username,
            role: user.user_role_name,
            employeeId: user.employee_id,
            fullName: `${user.employee_last_name} ${user.employee_first_name}`,
            mustChangePassword: Boolean(user.user_must_change_password) 
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '8h'});
        return res.status(200).json({
            message: payload.mustChangePassword
                ? "Sikeres bejelentkezés. Az alapértelmezett jelszót meg kell változtatnod a folytatáshoz."
                : "Sikeres bejelentkezés!",
            token: token,
            user: payload
        });
    }
    catch (error){
        console.error('Bejelentkezési hiba:', error);
        return res.status(500).json({message: 'Szerver hiba.'})
    }
}
module.exports = {login};