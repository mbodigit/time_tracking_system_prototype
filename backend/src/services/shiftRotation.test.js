const test = require('node:test');
const assert = require('node:assert');
const { resolveRotation, weekIndex } = require('./shiftRotation');

const SLOTS = [
    { start: '06:00:00', end: '14:00:00' },
    { start: '14:00:00', end: '22:00:00' },
    { start: '22:00:00', end: '06:00:00' }
];

const CYCLE_START = '2026-01-05';

test('a hét sorszáma a ciklus kezdő hetétől számítódik', () => {
    assert.strictEqual(weekIndex('2026-01-05', CYCLE_START), 0);
    assert.strictEqual(weekIndex('2026-01-08', CYCLE_START), 0);
    assert.strictEqual(weekIndex('2026-01-11', CYCLE_START), 0);
    assert.strictEqual(weekIndex('2026-01-12', CYCLE_START), 1);
    assert.strictEqual(weekIndex('2026-01-19', CYCLE_START), 2);
    assert.strictEqual(weekIndex('2025-12-29', CYCLE_START), -1);
});

test('az első csoport három hét alatt végigjárja a műszakokat', () => {
    const napok = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'];
    const kezdetek = napok.map(
        (nap) => resolveRotation(nap, 0, CYCLE_START, SLOTS).start
    );

    assert.deepStrictEqual(kezdetek, ['06:00:00', '14:00:00', '22:00:00', '06:00:00']);
});

test('a három csoport egy héten belül a három műszakot fedi', () => {
    const kezdetek = [0, 1, 2].map(
        (pozicio) => resolveRotation('2026-01-05', pozicio, CYCLE_START, SLOTS).start
    );

    assert.deepStrictEqual(kezdetek, ['06:00:00', '14:00:00', '22:00:00']);
    assert.strictEqual(new Set(kezdetek).size, 3);
});

test('a hét közbeni napok ugyanazt a műszakot adják', () => {
    const hetfo = resolveRotation('2026-01-12', 0, CYCLE_START, SLOTS);
    const pentek = resolveRotation('2026-01-16', 0, CYCLE_START, SLOTS);

    assert.deepStrictEqual(hetfo, pentek);
});

test('a ciklus kezdete előtti hét is feloldható', () => {
    const slot = resolveRotation('2025-12-29', 0, CYCLE_START, SLOTS);

    assert.strictEqual(slot.start, '22:00:00');
});

test('pozíció vagy cikluskezdet nélkül nincs rotáció', () => {
    assert.strictEqual(resolveRotation('2026-01-05', null, CYCLE_START, SLOTS), null);
    assert.strictEqual(resolveRotation('2026-01-05', 0, null, SLOTS), null);
    assert.strictEqual(resolveRotation('2026-01-05', 0, CYCLE_START, []), null);
});

test('a nulla pozíció érvényes érték', () => {
    const slot = resolveRotation('2026-01-05', 0, CYCLE_START, SLOTS);

    assert.strictEqual(slot.start, '06:00:00');
});

test('kétműszakos rend is leképezhető', () => {
    const ket_muszak = SLOTS.slice(0, 2);
    const kezdetek = ['2026-01-05', '2026-01-12', '2026-01-19'].map(
        (nap) => resolveRotation(nap, 0, CYCLE_START, ket_muszak).start
    );

    assert.deepStrictEqual(kezdetek, ['06:00:00', '14:00:00', '06:00:00']);
});
