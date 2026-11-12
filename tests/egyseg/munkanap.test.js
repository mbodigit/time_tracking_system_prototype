const test = require('node:test');
const assert = require('node:assert');
const { isWeekend, isWorkingDay } = require('../../backend/src/utils/dateHelpers');

test('a hétköznap munkanap', () => {
    assert.strictEqual(isWorkingDay('2026-09-28', 'workday'), true);
});

test('a szombat nem munkanap', () => {
    assert.strictEqual(isWorkingDay('2026-10-10', 'workday'), false);
});

test('a vasárnap nem munkanap', () => {
    assert.strictEqual(isWorkingDay('2026-10-11', 'workday'), false);
});

test('az áthelyezett munkanap szombaton is munkanap', () => {
    assert.strictEqual(isWorkingDay('2026-10-10', 'transferred'), true);
});

test('az áthelyezett munkanap hétköznap is munkanap', () => {
    assert.strictEqual(isWorkingDay('2026-10-12', 'transferred'), true);
});

test('a munkaszüneti nap hétköznap sem munkanap', () => {
    assert.strictEqual(isWorkingDay('2026-12-25', 'holiday'), false);
});

test('a pihenőnap hétköznap sem munkanap', () => {
    assert.strictEqual(isWorkingDay('2026-10-12', 'restday'), false);
});

test('a hétvége felismerése független a nap típusától', () => {
    assert.strictEqual(isWeekend('2026-10-10'), true);
    assert.strictEqual(isWeekend('2026-10-11'), true);
    assert.strictEqual(isWeekend('2026-10-12'), false);
});
