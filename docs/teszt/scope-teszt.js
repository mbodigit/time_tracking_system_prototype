require('dotenv').config({ quite: true });
const pool = require('../../backend/src/config/db');
const { getAccessibleEmployeeIds, canAccessEmployee } = require('../../backend/src/services/employeeScope');

const USER_ID = 2;      // ide a lekérdezett user_id
const EMPLOYEE_ID = 2;  // ide a lekérdezett user_employee_id

const futtat = async () => {
    const ids = await getAccessibleEmployeeIds(USER_ID, EMPLOYEE_ID);
    console.log('Elérhető dolgozók:', ids);

    const [sorok] = await pool.execute(
        `SELECT employee_id, employee_code FROM Employees
         WHERE employee_code LIKE 'TESZT-%' ORDER BY employee_code`
    );

    for (const sor of sorok) {
        const eredmeny = await canAccessEmployee(USER_ID, EMPLOYEE_ID, sor.employee_id);
        console.log(sor.employee_code, eredmeny ? 'elérhető' : 'NEM elérhető');
    }

    await pool.end();
};

futtat();