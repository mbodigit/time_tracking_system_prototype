const pool = require('../config/db');
const { serverError } = require('../utils/apiResponse');
const { nameColumns, fullName } = require('../utils/employeeName');
const bcrypt = require ("bcryptjs");
const jwt = require ('jsonwebtoken');

const MAX_FAILED_ATTEMPTS = 3;

const LOCKED_MESSAGE = 'A fiók zárolva van három sikertelen bejelentkezési '
    + 'kísérlet miatt. Kérem forduljon a HR osztályhoz új jelszóért.';

const login = async (req, res) => {
    const {username, password} = req.body;

    if (!username || !password) {
        return res.status(400).json({message: 'Kérem adjon meg egy érvényes felhasználónevet és jelszót!'});
    }

    try{
        const [userQueryRows] = await pool.execute(
            `SELECT 
                u.user_id, u.user_username, u.user_password_hash, u.user_status, u.user_must_change_password,
                u.user_failed_attempts, u.user_locked_at,
                r.user_role_name,
                e.employee_id, ${nameColumns('e')},
                s.employee_status_is_active
            FROM Users u
            JOIN UserRoles r ON r.user_role_id = u.user_role_id
            LEFT JOIN Employees e ON e.employee_id = u.user_employee_id
            LEFT JOIN EmployeeStatus s ON s.employee_status_id = e.employee_status_id
            WHERE u.user_username = ?`, [username]
            );
        if (userQueryRows.length === 0){
            return res.status(401).json({message: 'Hibás felhasználónév vagy jelszó!'});
        }

        const user = userQueryRows[0];

        if (user.user_locked_at) {
            return res.status(423).json({message: LOCKED_MESSAGE});
        }

        const isPasswordValid = await bcrypt.compare(password, user.user_password_hash);
        if (!isPasswordValid) {
            const failedAttempts = user.user_failed_attempts + 1;
            const isLocked = failedAttempts >= MAX_FAILED_ATTEMPTS;

            await pool.execute(
                `UPDATE Users
                 SET user_failed_attempts = ?, user_locked_at = ?
                 WHERE user_id = ?`,
                [failedAttempts, isLocked ? new Date() : null, user.user_id]
            );

            const remaining = MAX_FAILED_ATTEMPTS - failedAttempts;

            return res.status(isLocked ? 423 : 401).json({
                message: isLocked
                    ? LOCKED_MESSAGE
                    : 'Hibás felhasználónév vagy jelszó! Még '
                      + `${remaining} próbálkozása maradt a fiók zárolásáig.`
            });
        }

        if (user.user_failed_attempts > 0) {
            await pool.execute(
                `UPDATE Users
                 SET user_failed_attempts = 0, user_locked_at = NULL
                 WHERE user_id = ?`,
                [user.user_id]
            );
        }

        if (user.employee_id && !user.employee_status_is_active){
            return res.status(403).json({message: 'A dolgozó státusza inaktív! Kérem forduljon a HR osztályhoz.'})
        }

        if (!user.user_status){
            return res.status(403).json({message: 'A felhasználó státusza inaktív! Kérem forduljon az IT osztályhoz.'})
        }

        const payload = {
            userId: user.user_id,
            username: user.user_username,
            role: user.user_role_name,
            employeeId: user.employee_id ?? null,
            fullName: user.employee_id
                ? fullName(user)
                : user.user_username,
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
        return serverError(res, 'Bejelentkezési hiba', error);
    }
}
module.exports = {login};