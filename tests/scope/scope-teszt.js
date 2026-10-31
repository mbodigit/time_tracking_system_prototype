require('dotenv').config({ quiet: true });
const pool = require('../../backend/src/config/db');
const {
    getAccessibleEmployeeIds,
    canAccessEmployee
} = require('../../backend/src/services/employeeScope');

const USERNAME = process.argv[2] || 'demo.varga';

const run = async () => {
    const [users] = await pool.execute(
        `SELECT u.user_id, u.user_employee_id, r.user_role_name
         FROM Users u
         JOIN UserRoles r ON r.user_role_id = u.user_role_id
         WHERE u.user_username = ?`,
        [USERNAME]
    );

    if (users.length === 0) {
        console.error(`Nincs ilyen felhasználó: ${USERNAME}`);
        await pool.end();
        return;
    }

    const { user_id: userId, user_employee_id: employeeId } = users[0];

    console.log(`Vizsgált fiók: ${USERNAME} (user_id ${userId}, employee_id ${employeeId})`);
    console.log(`Szerepkör: ${users[0].user_role_name}`);
    console.log('');

    const ids = await getAccessibleEmployeeIds(userId, employeeId);

    const [reachable] = await pool.execute(
        `SELECT employee_code FROM Employees
         WHERE employee_id IN (${ids.map(() => '?').join(', ') || 'NULL'})
         ORDER BY employee_code`,
        ids
    );

    console.log(`Hatókör mérete: ${ids.length}`);
    console.log('Elérhető kódok:', reachable.map((row) => row.employee_code).join(', '));
    console.log('');

    const [tesztRows] = await pool.execute(
        `SELECT employee_id, employee_code FROM Employees
         WHERE employee_code LIKE 'TESZT-%' ORDER BY employee_code`
    );

    for (const row of tesztRows) {
        const hasAccess = await canAccessEmployee(userId, employeeId, row.employee_id);
        console.log(row.employee_code, hasAccess ? 'elérhető' : 'NEM elérhető');
    }

    await pool.end();
};

run();
