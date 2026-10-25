const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const PASSWORD_ALPHABET =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const PASSWORD_LENGTH = 12;
const CLOSED_STATUSES = ['Kilépett', 'Elhunyt'];

const generatePassword = () => {
    let password = '';
    for (let index = 0; index < PASSWORD_LENGTH; index++) {
        password += PASSWORD_ALPHABET[crypto.randomInt(0, PASSWORD_ALPHABET.length)];
    }
    return password;
};

const list = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT e.employee_id, e.employee_code,
                    e.employee_first_name, e.employee_last_name,
                    e.employee_work_email,
                    e.employee_user_group_id, g.user_group_name,
                    e.employee_category_id, cat.employee_category_name,
                    e.employee_status_id, st.employee_status_name,
                    st.employee_status_is_active,
                    e.employee_cost_center_id, cc.cost_center_name,
                    e.employee_work_schedule_id, w.work_schedule_name,
                    e.employee_working_hour_id, h.working_hour_num,
                    e.employee_core_hour_id, ch.core_hour_name,
                    e.employee_break_minutes, e.employee_break_paid,
                    e.employee_break_start, e.employee_break_end,
                    e.employee_annual_leave_days,
                    e.employee_manager_id,
                    m.employee_last_name  AS manager_last_name,
                    m.employee_first_name AS manager_first_name,
                    u.user_id, u.user_username, u.user_status
             FROM Employees e
             LEFT JOIN UserGroups         g   ON g.user_group_id         = e.employee_user_group_id
             LEFT JOIN EmployeeCategories cat ON cat.employee_category_id = e.employee_category_id
             LEFT JOIN EmployeeStatus     st  ON st.employee_status_id    = e.employee_status_id
             LEFT JOIN CostCenters        cc  ON cc.cost_center_id        = e.employee_cost_center_id
             LEFT JOIN WorkSchedules      w   ON w.work_schedule_id       = e.employee_work_schedule_id
             LEFT JOIN WorkingHours       h   ON h.working_hour_id        = e.employee_working_hour_id
             LEFT JOIN CoreHours          ch  ON ch.core_hour_id          = e.employee_core_hour_id
             LEFT JOIN Employees          m   ON m.employee_id            = e.employee_manager_id
             LEFT JOIN Users              u   ON u.user_employee_id       = e.employee_id
             ORDER BY e.employee_last_name, e.employee_first_name`
        );

        const employees = rows.map((row) => ({
            id: row.employee_id,
            code: row.employee_code,
            firstName: row.employee_first_name,
            lastName: row.employee_last_name,
            workEmail: row.employee_work_email,
            groupId: row.employee_user_group_id,
            groupName: row.user_group_name,
            categoryId: row.employee_category_id,
            categoryName: row.employee_category_name,
            statusId: row.employee_status_id,
            statusName: row.employee_status_name,
            isActive: Boolean(row.employee_status_is_active),
            costCenterId: row.employee_cost_center_id,
            costCenterName: row.cost_center_name,
            workScheduleId: row.employee_work_schedule_id,
            workScheduleName: row.work_schedule_name,
            workingHourId: row.employee_working_hour_id,
            workingHourNum: row.working_hour_num,
            coreHourId: row.employee_core_hour_id,
            coreHourName: row.core_hour_name,
            breakMinutes: row.employee_break_minutes,
            breakPaid: Boolean(row.employee_break_paid),
            breakStart: row.employee_break_start,
            breakEnd: row.employee_break_end,
            annualLeaveDays: row.employee_annual_leave_days,
            managerId: row.employee_manager_id,
            managerName: row.manager_last_name
                ? `${row.manager_last_name} ${row.manager_first_name}`
                : null,
            userId: row.user_id,
            username: row.user_username,
            userActive: row.user_id ? Boolean(row.user_status) : null
        }));

        return res.status(200).json({ employees });
    } catch (error) {
        console.error('Dolgozói lista hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const options = async (req, res) => {
    try {
        const [groups] = await pool.execute(
            `SELECT user_group_id, user_group_name FROM UserGroups
             WHERE user_group_status = 'Aktív' ORDER BY user_group_name`
        );
        const [categories] = await pool.execute(
            `SELECT employee_category_id, employee_category_name
             FROM EmployeeCategories ORDER BY employee_category_name`
        );
        const [statuses] = await pool.execute(
            `SELECT employee_status_id, employee_status_name, employee_status_is_active
             FROM EmployeeStatus ORDER BY employee_status_name`
        );
        const [costCenters] = await pool.execute(
            `SELECT cost_center_id, cost_center_name, cost_center_code
             FROM CostCenters ORDER BY cost_center_name`
        );
        const [workSchedules] = await pool.execute(
            `SELECT work_schedule_id, work_schedule_name
             FROM WorkSchedules ORDER BY work_schedule_name`
        );
        const [workingHours] = await pool.execute(
            `SELECT working_hour_id, working_hour_num, working_hour_name
             FROM WorkingHours ORDER BY working_hour_num`
        );
        const [coreHours] = await pool.execute(
            `SELECT core_hour_id, core_hour_name FROM CoreHours ORDER BY core_hour_start`
        );
        const [managers] = await pool.execute(
            `SELECT employee_id, employee_last_name, employee_first_name
             FROM Employees ORDER BY employee_last_name, employee_first_name`
        );
        const [roles] = await pool.execute(
            `SELECT user_role_id, user_role_name FROM UserRoles ORDER BY user_role_id`
        );

        return res.status(200).json({
            groups: groups.map((row) => ({
                id: row.user_group_id, name: row.user_group_name
            })),
            categories: categories.map((row) => ({
                id: row.employee_category_id, name: row.employee_category_name
            })),
            statuses: statuses.map((row) => ({
                id: row.employee_status_id,
                name: row.employee_status_name,
                isActive: Boolean(row.employee_status_is_active)
            })),
            costCenters: costCenters.map((row) => ({
                id: row.cost_center_id,
                name: `${row.cost_center_name} (${row.cost_center_code})`
            })),
            workSchedules: workSchedules.map((row) => ({
                id: row.work_schedule_id, name: row.work_schedule_name
            })),
            workingHours: workingHours.map((row) => ({
                id: row.working_hour_id,
                name: row.working_hour_name || `${row.working_hour_num} óra`
            })),
            coreHours: coreHours.map((row) => ({
                id: row.core_hour_id, name: row.core_hour_name
            })),
            managers: managers.map((row) => ({
                id: row.employee_id,
                name: `${row.employee_last_name} ${row.employee_first_name}`
            })),
            roles: roles.map((row) => ({
                id: row.user_role_id, name: row.user_role_name
            }))
        });
    } catch (error) {
        console.error('Dolgozói törzsadat hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const validateEmployee = (body) => {
    if (!String(body.lastName || '').trim() || !String(body.firstName || '').trim()) {
        return 'A vezetéknév és a keresztnév megadása kötelező.';
    }

    if (!Number(body.costCenterId)) {
        return 'A költséghely megadása kötelező.';
    }

    if (!Number(body.categoryId)) {
        return 'Az állománycsoport megadása kötelező.';
    }

    if (!Number(body.statusId)) {
        return 'A státusz megadása kötelező.';
    }

    return null;
};

const employeeValues = (body) => ([
    String(body.lastName).trim(),
    String(body.firstName).trim(),
    String(body.workEmail || '').trim() || null,
    Number(body.groupId) || null,
    Number(body.categoryId),
    Number(body.statusId),
    Number(body.costCenterId),
    Number(body.workScheduleId) || null,
    Number(body.workingHourId) || null,
    Number(body.coreHourId) || null,
    Number(body.breakMinutes) || null,
    body.breakPaid ? 1 : 0,
    body.breakStart || null,
    body.breakEnd || null,
    Number(body.annualLeaveDays) || null,
    Number(body.managerId) || null
]);

const create = async (req, res) => {
    const body = req.body || {};
    const validationError = validateEmployee(body);

    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [settings] = await connection.execute(
            `SELECT company_next_employee_code
             FROM CompanySettings WHERE company_settings_id = 1 FOR UPDATE`
        );

        if (settings.length === 0) {
            await connection.rollback();
            return res.status(500).json({ message: 'A cégadatok nem érhetők el.' });
        }

        const sequence = settings[0].company_next_employee_code;
        const employeeCode = String(sequence).padStart(5, '0');

        await connection.execute(
            `UPDATE CompanySettings SET company_next_employee_code = ?
             WHERE company_settings_id = 1`,
            [sequence + 1]
        );

        const [result] = await connection.execute(
            `INSERT INTO Employees (
                employee_code, employee_last_name, employee_first_name,
                employee_work_email, employee_user_group_id,
                employee_category_id, employee_status_id, employee_cost_center_id,
                employee_work_schedule_id, employee_working_hour_id,
                employee_core_hour_id, employee_break_minutes, employee_break_paid,
                employee_break_start, employee_break_end,
                employee_annual_leave_days, employee_manager_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [employeeCode, ...employeeValues(body)]
        );

        await connection.commit();

        return res.status(201).json({
            message: 'A dolgozó felvételre került.',
            id: result.insertId,
            code: employeeCode
        });
    } catch (error) {
        await connection.rollback();
        console.error('Dolgozó felvételi hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    } finally {
        connection.release();
    }
};

const update = async (req, res) => {
    const employeeId = Number(req.params.id);
    const body = req.body || {};

    if (!employeeId) {
        return res.status(400).json({ message: 'Érvénytelen dolgozói azonosító.' });
    }

    const validationError = validateEmployee(body);

    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE Employees SET
                employee_last_name = ?, employee_first_name = ?,
                employee_work_email = ?, employee_user_group_id = ?,
                employee_category_id = ?, employee_status_id = ?,
                employee_cost_center_id = ?, employee_work_schedule_id = ?,
                employee_working_hour_id = ?, employee_core_hour_id = ?,
                employee_break_minutes = ?, employee_break_paid = ?,
                employee_break_start = ?, employee_break_end = ?,
                employee_annual_leave_days = ?, employee_manager_id = ?
             WHERE employee_id = ?`,
            [...employeeValues(body), employeeId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'A dolgozó nem található.' });
        }

        return res.status(200).json({ message: 'A dolgozó adatai módosításra kerültek.' });
    } catch (error) {
        console.error('Dolgozó módosítási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const createUser = async (req, res) => {
    const employeeId = Number(req.params.id);
    const roleId = Number(req.body?.roleId);

    if (!employeeId || !roleId) {
        return res.status(400).json({
            message: 'A dolgozó azonosítója és a szerepkör megadása kötelező.'
        });
    }

    try {
        const [employees] = await pool.execute(
            `SELECT employee_code, employee_work_email
             FROM Employees WHERE employee_id = ?`,
            [employeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({ message: 'A dolgozó nem található.' });
        }

        if (!employees[0].employee_work_email) {
            return res.status(409).json({
                message: 'Fiók csak vállalati e-mail címmel rendelkező dolgozóhoz hozható létre.'
            });
        }

        const [existing] = await pool.execute(
            `SELECT user_id FROM Users WHERE user_employee_id = ? LIMIT 1`,
            [employeeId]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'Ehhez a dolgozóhoz már tartozik fiók.' });
        }

        const username = String(req.body?.username || '').trim()
            || employees[0].employee_work_email.split('@')[0];

        const password = generatePassword();
        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await pool.execute(
            `INSERT INTO Users (
                user_username, user_password_hash, user_employee_id,
                user_role_id, user_status, user_must_change_password
             ) VALUES (?, ?, ?, ?, 1, 1)`,
            [username, passwordHash, employeeId, roleId]
        );

        return res.status(201).json({
            message: 'A felhasználói fiók létrehozásra került.',
            id: result.insertId,
            username,
            password
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Ez a felhasználónév már foglalt.' });
        }

        console.error('Fiók létrehozási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

const updateUser = async (req, res) => {
    const userId = Number(req.params.id);
    const { isActive, resetPassword } = req.body || {};

    if (!userId) {
        return res.status(400).json({ message: 'Érvénytelen felhasználói azonosító.' });
    }

    try {
        const [users] = await pool.execute(
            `SELECT u.user_id, st.employee_status_name
             FROM Users u
             JOIN Employees e      ON e.employee_id        = u.user_employee_id
             JOIN EmployeeStatus st ON st.employee_status_id = e.employee_status_id
             WHERE u.user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'A felhasználói fiók nem található.' });
        }

        if (isActive === false && !CLOSED_STATUSES.includes(users[0].employee_status_name)) {
            return res.status(409).json({
                message: 'A fiók csak Kilépett vagy Elhunyt státuszú dolgozónál tiltható le.'
            });
        }

        if (resetPassword) {
            const password = generatePassword();
            const passwordHash = await bcrypt.hash(password, 10);

            await pool.execute(
                `UPDATE Users
                 SET user_password_hash = ?, user_must_change_password = 1
                 WHERE user_id = ?`,
                [passwordHash, userId]
            );

            return res.status(200).json({
                message: 'A jelszó új értékre került, a következő belépéskor cserélni kell.',
                password
            });
        }

        if (typeof isActive === 'boolean') {
            await pool.execute(
                `UPDATE Users SET user_status = ? WHERE user_id = ?`,
                [isActive ? 1 : 0, userId]
            );

            return res.status(200).json({
                message: isActive
                    ? 'A fiók engedélyezésre került.'
                    : 'A fiók letiltásra került.'
            });
        }

        return res.status(400).json({ message: 'Nincs végrehajtható művelet a kérésben.' });
    } catch (error) {
        console.error('Fiók módosítási hiba:', error);
        return res.status(500).json({ message: 'Szerver hiba.' });
    }
};

module.exports = { list, options, create, update, createUser, updateUser };