const BASE = process.env.BASE_URL || 'http://localhost:3000/api';
const PASSWORD = 'Demo1234';
const CODE = '00019';
const YEAR = 2026;
const MONTH = Number(process.argv[2]) || 9;

const login = async (username) => {
    const response = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: PASSWORD })
    });

    if (!response.ok) {
        throw new Error(`Bejelentkezés sikertelen: ${username} (${response.status})`);
    }

    return (await response.json()).token;
};

const get = async (token, path) => {
    const response = await fetch(`${BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`${path} -> ${response.status}`);
    }

    return response.json();
};

const run = async () => {
    const token = await login('demo.hr');

    const { employees } = await get(token, '/employees');
    const target = employees.find((item) => item.code === CODE);

    if (!target) {
        throw new Error(`Nincs ilyen dolgozó a hatókörben: ${CODE}`);
    }

    const report = await get(
        token, `/time-entries?year=${YEAR}&month=${MONTH}&employeeId=${target.id}`
    );

    console.log('');
    console.log('Dolgozó:', report.employeeProfile.name, `(${CODE})`);
    console.log('Munkarend:', report.employeeProfile.workScheduleName);
    console.log('Törzsidő a profilban:',
        report.employeeProfile.coreStart || '(nincs)',
        report.employeeProfile.coreEnd || '');
    console.log('');
    console.log('Nap         Beosztás kezdete     Beosztás vége        Beosztás perc');
    console.log('-'.repeat(76));

    for (const day of report.days) {
        if (day.scheduledMinutes === null || day.scheduledMinutes === 0) {
            continue;
        }

        console.log(
            day.date.padEnd(12),
            String(day.scheduleStart || '-').padEnd(21),
            String(day.scheduleEnd || '-').padEnd(21),
            day.scheduledMinutes
        );
    }
};

run().catch((error) => {
    console.error('Hiba:', error.message);
    process.exit(1);
});
