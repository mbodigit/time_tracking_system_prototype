const BASE = process.env.BASE_URL || 'http://localhost:3000/api';
const PASSWORD = 'Demo123';
const YEAR = 2026;
const MONTH = 1;
const TRANSFERRED_WORKDAY = '2026-01-17';

const login = async (username) => {
    const response = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: PASSWORD })
    });

    if (!response.ok) {
        throw new Error(`Bejelentkezés sikertelen: ${username} (${response.status})`);
    }

    const data = await response.json();
    return data.token;
};

const callApi = async (token, method, path, body) => {
    const response = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: response.status, data };
};

const CASES = [
    {
        name: 'Hétköznapi éjszakás, sablon szerinti szünet',
        code: '00027', date: '2026-01-07',
        start: '2026-01-07 22:00:00', end: '2026-01-08 06:00:00',
        isOrdered: false,
        expected: { presenceMinutes: 480, breakMinutes: 30, workedMinutes: 450,
                scheduledMinutes: 450, balanceMinutes: 0, settledMinutes: 450,
                allowances: { ejszakai: 450 } }
    },
    {
        name: 'Plusz óra a beosztás előtt, elrendelés nélkül',
        code: '00027', date: '2026-01-08',
        start: '2026-01-08 20:00:00', end: '2026-01-09 06:00:00',
        isOrdered: false,
        expected: { presenceMinutes: 600, breakMinutes: 30, workedMinutes: 570,
                scheduledMinutes: 450, balanceMinutes: 120, settledMinutes: 570,
                allowances: { ejszakai: 450 } }
    },
    {
        name: 'Ugyanaz elrendelve, a plusz órát felár váltja ki',
        code: '00027', date: '2026-01-09',
        start: '2026-01-09 20:00:00', end: '2026-01-10 06:00:00',
        isOrdered: true,
        expected: { presenceMinutes: 600, breakMinutes: 30, workedMinutes: 570,
                scheduledMinutes: 450, balanceMinutes: 0, settledMinutes: 570,
                allowances: { ejszakai: 450, tulora: 120 } }
    },
    {
        name: 'Szombati éjszakás, szünet nélkül',
        code: '00027', date: '2026-01-03',
        start: '2026-01-03 22:00:00', end: '2026-01-04 06:00:00',
        isOrdered: false,
        expected: { presenceMinutes: 480, breakMinutes: 0, workedMinutes: 480,
                scheduledMinutes: 0, balanceMinutes: 0, settledMinutes: 480,
                allowances: { szombat: 120, vasarnap: 360 } }
    },
    {
        name: 'Szombati éjszakás, kézzel megadott szünettel',
        code: '00027', date: '2026-01-10',
        start: '2026-01-10 22:00:00', end: '2026-01-11 06:00:00',
        breakStart: '2026-01-11 02:00:00', breakEnd: '2026-01-11 02:30:00',
        isOrdered: false,
        expected: { presenceMinutes: 480, breakMinutes: 30, workedMinutes: 450,
                scheduledMinutes: 0, balanceMinutes: 0, settledMinutes: 450,
                allowances: { szombat: 120, vasarnap: 330 } }
    },
    {
        name: 'Vasárnapi munkavégzés',
        code: '00027', date: '2026-01-04',
        start: '2026-01-04 06:00:00', end: '2026-01-04 14:00:00',
        isOrdered: false,
        expected: { presenceMinutes: 480, breakMinutes: 0, workedMinutes: 480,
                scheduledMinutes: 0, balanceMinutes: 0, settledMinutes: 480,
                allowances: { vasarnap: 480 } }
    },
    {
        name: 'Munkaszüneti napon kezdődő éjszakás műszak',
        code: '00027', date: '2026-01-01',
        start: '2026-01-01 22:00:00', end: '2026-01-02 06:00:00',
        isOrdered: false,
        expected: { presenceMinutes: 480, breakMinutes: 0, workedMinutes: 480,
                scheduledMinutes: 0, balanceMinutes: 360, settledMinutes: 480,
                allowances: { munkaszuneti: 120 } }
    },
    {
        name: 'Nem műszakos dolgozó elrendelt túlórája',
        code: '00057', date: '2026-01-02',
        start: '2026-01-02 07:00:00', end: '2026-01-02 19:00:00',
        isOrdered: true,
        expected: { presenceMinutes: 720, breakMinutes: 30, workedMinutes: 690,
                scheduledMinutes: 450, balanceMinutes: 0, settledMinutes: 690,
                allowances: { tulora: 240 } }
    },
    {
        name: 'A szünet a tényleges munkaidőn kívülre esik',
        code: '00027', date: '2026-01-13',
        start: '2026-01-13 22:00:00', end: '2026-01-14 01:00:00',
        isOrdered: false,
        expected: { presenceMinutes: 180, breakMinutes: 0, workedMinutes: 180,
                scheduledMinutes: 480, balanceMinutes: -300, settledMinutes: 180,
                allowances: { ejszakai: 180 } }
    },
    {
        name: 'Áthelyezett munkanapra eső szombati éjszakás',
        code: '00027', date: TRANSFERRED_WORKDAY,
        start: `${TRANSFERRED_WORKDAY} 22:00:00`, end: '2026-01-18 06:00:00',
        isOrdered: false,
        expected: { presenceMinutes: 480, breakMinutes: 30, workedMinutes: 450,
                scheduledMinutes: 450, balanceMinutes: 0, settledMinutes: 450,
                allowances: { ejszakai: 450 } }
    }
];

const resolveEmployeeIds = async (token) => {
    const { status, data } = await callApi(token, 'GET', '/employees');

    if (status !== 200) {
        throw new Error(`A dolgozói lista nem kérhető le (${status}).`);
    }

    const idsByCode = {};
    for (const employee of data.employees) {
        idsByCode[employee.code] = employee.id;
    }
    return idsByCode;
};

const setCalendarDay = async (token, date, dayType) => {
    const response = await callApi(token, 'POST', '/calendar', {
        date,
        dayType,
        note: 'Regressziós teszt'
    });

    if (response.status !== 200) {
        throw new Error(`A naptári nap nem rögzíthető: ${date} (${response.status})`);
    }
};

const removeCalendarDay = async (token, date) => {
    await callApi(token, 'DELETE', `/calendar/${date}`);
};

const saveEntry = async (token, testCase, employeeId) => {
    const { data: report } = await callApi(
        token, 'GET', `/time-entries?year=${YEAR}&month=${MONTH}&employeeId=${employeeId}`
    );

    const existing = report.days.find((day) => day.date === testCase.date && day.id);

    const fields = {
        workStart: testCase.start,
        workEnd: testCase.end,
        note: 'Regressziós teszt'
    };

    if (testCase.breakStart) {
        fields.breakStart = testCase.breakStart;
        fields.breakEnd = testCase.breakEnd;
    }

    const response = existing
        ? await callApi(token, 'PATCH', `/time-entries/${existing.id}`, fields)
        : await callApi(token, 'POST', '/time-entries', { employeeId, workingDate: testCase.date, ...fields });

    if (response.status !== 200 && response.status !== 201) {
        throw new Error(
            `Rögzítés sikertelen: ${testCase.name} (${response.status}) ${JSON.stringify(response.data)}`
        );
    }
};

const formatMinutes = (minutes) => {
    if (minutes === null || minutes === undefined) return '-';
    const sign = minutes < 0 ? '-' : '';
    const absolute = Math.abs(minutes);
    return `${sign}${Math.floor(absolute / 60)}:${String(absolute % 60).padStart(2, '0')}`;
};

const compare = (day, expected) => {
    const differences = [];

    for (const [key, value] of Object.entries(expected)) {
        if (key === 'allowances') continue;
        if (day[key] !== value) {
            differences.push(`${key}: várt ${formatMinutes(value)}, kapott ${formatMinutes(day[key])}`);
        }
    }

    const keys = new Set([
        ...Object.keys(expected.allowances),
        ...Object.keys(day.allowances || {})
    ]);

    for (const key of keys) {
        const expectedValue = expected.allowances[key] || 0;
        const actualValue = (day.allowances || {})[key] || 0;
        if (expectedValue !== actualValue) {
            differences.push(
                `${key}: várt ${formatMinutes(expectedValue)}, kapott ${formatMinutes(actualValue)}`
            );
        }
    }

    return differences;
};

const run = async () => {
    const hrToken = await login('demo.hr');
    const shiftManagerToken = await login('demo.elokeszites.c');
    const officeManagerToken = await login('demo.ertekesites');

    const idsByCode = await resolveEmployeeIds(hrToken);

    await setCalendarDay(hrToken, TRANSFERRED_WORKDAY, 'Munkanap');

    for (const testCase of CASES) {
        const employeeId = idsByCode[testCase.code];

        if (!employeeId) {
            throw new Error(`Nincs ilyen teszt dolgozó: ${testCase.code}`);
        }

        await saveEntry(hrToken, testCase, employeeId);

        const approverToken = testCase.code === '00027'
            ? shiftManagerToken
            : officeManagerToken;

        const response = await callApi(approverToken, 'PUT', '/time-entries/ordered', {
            employeeId,
            workingDate: testCase.date,
            isOrdered: Boolean(testCase.isOrdered)
        });

        if (testCase.isOrdered && response.status !== 200 && response.status !== 201) {
            throw new Error(`Elrendelés sikertelen: ${testCase.name} (${response.status})`);
        }
    }

    const reportsByCode = {};
    for (const code of new Set(CASES.map((testCase) => testCase.code))) {
        const employeeId = idsByCode[code];
        const { data } = await callApi(
            hrToken, 'GET', `/time-entries?year=${YEAR}&month=${MONTH}&employeeId=${employeeId}`
        );
        reportsByCode[code] = data;
    }

    let failureCount = 0;

    console.log('');
    console.log('Eset'.padEnd(52), 'Nap'.padEnd(12), 'Eredmény');
    console.log('-'.repeat(92));

    for (const testCase of CASES) {
        const day = reportsByCode[testCase.code].days.find(
            (item) => item.date === testCase.date
        );
        const differences = day
            ? compare(day, testCase.expected)
            : ['a nap nem található a válaszban'];

        console.log(
            testCase.name.padEnd(52),
            testCase.date.padEnd(12),
            differences.length === 0 ? 'OK' : 'HIBA'
        );

        for (const difference of differences) {
            console.log(' '.repeat(66), difference);
            failureCount++;
        }
    }

    await removeCalendarDay(hrToken, TRANSFERRED_WORKDAY);

    console.log('-'.repeat(92));
    console.log(
        failureCount === 0
            ? `${CASES.length} eset, mind megfelelt.`
            : `${CASES.length} eset, ${failureCount} eltérés.`
    );

    process.exit(failureCount === 0 ? 0 : 1);
};

run().catch((error) => {
    console.error('A futtatás megszakadt:', error.message);
    process.exit(1);
});
