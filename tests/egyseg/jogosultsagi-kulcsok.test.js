const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const GYOKER = path.join(__dirname, '..', '..');

const olvas = (relativUtvonal) =>
    fs.readFileSync(path.join(GYOKER, relativUtvonal), 'utf8');

const osszesForras = (konyvtar) => {
    const elemek = fs.readdirSync(path.join(GYOKER, konyvtar), {
        withFileTypes: true
    });

    return elemek.flatMap((elem) => {
        const ut = path.join(konyvtar, elem.name);

        if (elem.isDirectory()) {
            return osszesForras(ut);
        }

        return elem.name.endsWith('.js') ? [olvas(ut)] : [];
    });
};

const definialtKulcsok = () => {
    const dml = olvas('db/install/01_jogosultsag_DML.sql');
    const kulcsok = new Set();

    for (const talalat of dml.matchAll(/SELECT '([a-z_]+(?:\.[a-z_]+)?)'[^\n]*AS kulcs/g)) {
        kulcsok.add(talalat[1]);
    }

    for (const talalat of dml.matchAll(/UNION ALL SELECT '([a-z_]+(?:\.[a-z_]+)?)',/g)) {
        kulcsok.add(talalat[1]);
    }

    return kulcsok;
};

const hasznaltKulcsok = () => {
    const kulcsok = new Set();

    for (const forras of osszesForras('backend/src')) {
        for (const talalat of forras.matchAll(/authorizePermission\('([^']+)'/g)) {
            kulcsok.add(talalat[1]);
        }

        for (const talalat of forras.matchAll(/permission: '([^']+)'/g)) {
            kulcsok.add(talalat[1]);
        }
    }

    return kulcsok;
};

test('minden használt jogosultsági kulcs létezik az adatbázisban', () => {
    const definialt = definialtKulcsok();
    const hianyzo = [...hasznaltKulcsok()].filter((kulcs) => !definialt.has(kulcs));

    assert.deepStrictEqual(hianyzo, []);
});

test('minden fül szintű jogosultságot ellenőriz is a szerveroldal', () => {
    const hasznalt = hasznaltKulcsok();

    const fulek = [...definialtKulcsok()].filter((kulcs) => kulcs.includes('.'));
    const nemEllenorzott = fulek.filter((kulcs) => !hasznalt.has(kulcs));

    assert.deepStrictEqual(nemEllenorzott, []);
});
