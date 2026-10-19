const BASE = process.env.BASE_URL || 'http://localhost:3000/api';
const JELSZO = 'Teszt1234';
const EV = 2026;
const HONAP = 1;

const login = async (felhasznalo) => {
    const valasz = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: felhasznalo, password: JELSZO })
    });

    if (!valasz.ok) {
        throw new Error(`Bejelentkezés sikertelen: ${felhasznalo} (${valasz.status})`);
    }

    const adat = await valasz.json();
    return adat.token;
};

const hivas = async (token, method, utvonal, body) => {
    const valasz = await fetch(`${BASE}${utvonal}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const szoveg = await valasz.text();
    let adat = null;
    try { adat = szoveg ? JSON.parse(szoveg) : null; } catch { adat = szoveg; }
    return { status: valasz.status, adat };
};

const ESETEK = [
    {
        nev: 'Hétköznapi éjszakás, sablon szerinti szünet',
        kod: 'TESZT-DM1', nap: '2026-01-07',
        kezdes: '2026-01-07 22:00:00', vegzes: '2026-01-08 06:00:00',
        elrendelve: false,
        vart: { presenceMinutes: 480, breakMinutes: 30, workedMinutes: 450,
                scheduledMinutes: 450, balanceMinutes: 0, settledMinutes: 450,
                allowances: { '30': 450 } }
    },
    {
        nev: 'Plusz óra a beosztás előtt, elrendelés nélkül',
        kod: 'TESZT-DM1', nap: '2026-01-08',
        kezdes: '2026-01-08 20:00:00', vegzes: '2026-01-09 06:00:00',
        elrendelve: false,
        vart: { presenceMinutes: 600, breakMinutes: 30, workedMinutes: 570,
                scheduledMinutes: 450, balanceMinutes: 120, settledMinutes: 570,
                allowances: { '30': 450 } }
    },
    {
        nev: 'Ugyanaz elrendelve, a plusz órát felár váltja ki',
        kod: 'TESZT-DM1', nap: '2026-01-09',
        kezdes: '2026-01-09 20:00:00', vegzes: '2026-01-10 06:00:00',
        elrendelve: true,
        vart: { presenceMinutes: 600, breakMinutes: 30, workedMinutes: 570,
                scheduledMinutes: 450, balanceMinutes: 0, settledMinutes: 570,
                allowances: { '30': 450, '50': 120 } }
    },
    {
        nev: 'Szombati éjszakás, szünet nélkül',
        kod: 'TESZT-DM1', nap: '2026-01-03',
        kezdes: '2026-01-03 22:00:00', vegzes: '2026-01-04 06:00:00',
        elrendelve: false,
        vart: { presenceMinutes: 480, breakMinutes: 0, workedMinutes: 480,
                scheduledMinutes: 0, balanceMinutes: 0, settledMinutes: 480,
                allowances: { '100': 120, '200': 360 } }
    },
    {
        nev: 'Szombati éjszakás, kézzel megadott szünettel',
        kod: 'TESZT-DM1', nap: '2026-01-10',
        kezdes: '2026-01-10 22:00:00', vegzes: '2026-01-11 06:00:00',
        szunetKezdes: '2026-01-11 02:00:00', szunetVegzes: '2026-01-11 02:30:00',
        elrendelve: false,
        vart: { presenceMinutes: 480, breakMinutes: 30, workedMinutes: 450,
                scheduledMinutes: 0, balanceMinutes: 0, settledMinutes: 450,
                allowances: { '100': 120, '200': 330 } }
    },
    {
        nev: 'Vasárnapi munkavégzés',
        kod: 'TESZT-DM1', nap: '2026-01-04',
        kezdes: '2026-01-04 06:00:00', vegzes: '2026-01-04 14:00:00',
        elrendelve: false,
        vart: { presenceMinutes: 480, breakMinutes: 0, workedMinutes: 480,
                scheduledMinutes: 0, balanceMinutes: 0, settledMinutes: 480,
                allowances: { '200': 480 } }
    },
    {
        nev: 'Munkaszüneti napon kezdődő éjszakás műszak',
        kod: 'TESZT-DM1', nap: '2026-01-01',
        kezdes: '2026-01-01 22:00:00', vegzes: '2026-01-02 06:00:00',
        elrendelve: false,
        vart: { presenceMinutes: 480, breakMinutes: 0, workedMinutes: 480,
                scheduledMinutes: 0, balanceMinutes: 360, settledMinutes: 480,
                allowances: { '200': 120 } }
    },
    {
        nev: 'Nem műszakos dolgozó elrendelt túlórája',
        kod: 'TESZT-DN1', nap: '2026-01-02',
        kezdes: '2026-01-02 07:00:00', vegzes: '2026-01-02 19:00:00',
        elrendelve: true,
        vart: { presenceMinutes: 720, breakMinutes: 30, workedMinutes: 690,
                scheduledMinutes: 450, balanceMinutes: 0, settledMinutes: 690,
                allowances: { '50': 240 } }
    },
        {
        nev: 'A szünet a tényleges munkaidőn kívülre esik',
        kod: 'TESZT-DM1', nap: '2026-01-13',
        kezdes: '2026-01-13 22:00:00', vegzes: '2026-01-14 01:00:00',
        elrendelve: false,
        vart: { presenceMinutes: 180, breakMinutes: 0, workedMinutes: 180,
                scheduledMinutes: 480, balanceMinutes: -300, settledMinutes: 180,
                allowances: { '30': 180 } }
    }
];

const azonosit = async (token) => {
    const { status, adat } = await hivas(token, 'GET', '/employees');

    if (status !== 200) {
        throw new Error(`A dolgozói lista nem kérhető le (${status}).`);
    }

    const terkep = {};
    for (const dolgozo of adat.employees) {
        terkep[dolgozo.code] = dolgozo.id;
    }
    return terkep;
};

const rogzit = async (token, eset, employeeId) => {
    const { adat: honap } = await hivas(
        token, 'GET', `/time-entries?year=${EV}&month=${HONAP}&employeeId=${employeeId}`
    );

    const letezo = honap.days.find((nap) => nap.date === eset.nap && nap.id);

    const mezok = {
        workStart: eset.kezdes,
        workEnd: eset.vegzes,
        note: 'Regressziós teszt'
    };

    if (eset.szunetKezdes) {
        mezok.breakStart = eset.szunetKezdes;
        mezok.breakEnd = eset.szunetVegzes;
    }

    const valasz = letezo
        ? await hivas(token, 'PATCH', `/time-entries/${letezo.id}`, mezok)
        : await hivas(token, 'POST', '/time-entries', { employeeId, workingDate: eset.nap, ...mezok });

    if (valasz.status !== 200 && valasz.status !== 201) {
        throw new Error(
            `Rögzítés sikertelen: ${eset.nev} (${valasz.status}) ${JSON.stringify(valasz.adat)}`
        );
    }
};

const formaz = (percek) => {
    if (percek === null || percek === undefined) return '-';
    const elojel = percek < 0 ? '-' : '';
    const abszolut = Math.abs(percek);
    return `${elojel}${Math.floor(abszolut / 60)}:${String(abszolut % 60).padStart(2, '0')}`;
};

const osszevet = (nap, vart) => {
    const elteresek = [];

    for (const [kulcs, ertek] of Object.entries(vart)) {
        if (kulcs === 'allowances') continue;
        if (nap[kulcs] !== ertek) {
            elteresek.push(`${kulcs}: várt ${formaz(ertek)}, kapott ${formaz(nap[kulcs])}`);
        }
    }

    const kulcsok = new Set([
        ...Object.keys(vart.allowances),
        ...Object.keys(nap.allowances || {})
    ]);

    for (const kulcs of kulcsok) {
        const vartErtek = vart.allowances[kulcs] || 0;
        const kapott = (nap.allowances || {})[kulcs] || 0;
        if (vartErtek !== kapott) {
            elteresek.push(`${kulcs}%: várt ${formaz(vartErtek)}, kapott ${formaz(kapott)}`);
        }
    }

    return elteresek;
};

const fut = async () => {
    const tokenHr = await login('teszt.hr');
    const tokenVezetoM = await login('teszt.vezeto.m');
    const tokenVezetoNm = await login('teszt.vezeto.nm');

    const dolgozok = await azonosit(tokenHr);

    for (const eset of ESETEK) {
        const employeeId = dolgozok[eset.kod];

        if (!employeeId) {
            throw new Error(`Nincs ilyen teszt dolgozó: ${eset.kod}`);
        }

        await rogzit(tokenHr, eset, employeeId);

        const elrendeloToken = eset.kod === 'TESZT-DM1' ? tokenVezetoM : tokenVezetoNm;

        const valasz = await hivas(elrendeloToken, 'PUT', '/time-entries/ordered', {
            employeeId,
            workingDate: eset.nap,
            isOrdered: Boolean(eset.elrendelve)
        });

        if (eset.elrendelve && valasz.status !== 200 && valasz.status !== 201) {
            throw new Error(`Elrendelés sikertelen: ${eset.nev} (${valasz.status})`);
        }
    }

    const honapok = {};
    for (const kod of new Set(ESETEK.map((eset) => eset.kod))) {
        const employeeId = dolgozok[kod];
        const { adat } = await hivas(
            tokenHr, 'GET', `/time-entries?year=${EV}&month=${HONAP}&employeeId=${employeeId}`
        );
        honapok[kod] = adat;
    }

    let hibas = 0;

    console.log('');
    console.log('Eset'.padEnd(52), 'Nap'.padEnd(12), 'Eredmény');
    console.log('-'.repeat(92));

    for (const eset of ESETEK) {
        const nap = honapok[eset.kod].days.find((elem) => elem.date === eset.nap);
        const elteresek = nap ? osszevet(nap, eset.vart) : ['a nap nem található a válaszban'];

        console.log(
            eset.nev.padEnd(52),
            eset.nap.padEnd(12),
            elteresek.length === 0 ? 'OK' : 'HIBA'
        );

        for (const elteres of elteresek) {
            console.log(' '.repeat(66), elteres);
            hibas++;
        }
    }

    console.log('-'.repeat(92));
    console.log(
        hibas === 0
            ? `${ESETEK.length} eset, mind megfelelt.`
            : `${ESETEK.length} eset, ${hibas} eltérés.`
    );

    process.exit(hibas === 0 ? 0 : 1);
};

fut().catch((hiba) => {
    console.error('A futtatás megszakadt:', hiba.message);
    process.exit(1);
});