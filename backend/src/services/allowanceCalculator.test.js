const test = require('node:test');
const assert = require('node:assert');
const { calculateAllowances } = require('./allowanceCalculator')

test('hétköznapi nappali műszak, nincs pótlék', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T08:00:00'),
        workEnd:       new Date('2026-09-28T16:00:00'),
        scheduleStart: new Date('2026-09-28T08:00:00'),
        scheduleEnd:   new Date('2026-09-28T16:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: false,
        isOrdered:     false,
        breakMinutes:  30,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 450,
        premiumOutsideMinutes: 0,
        allowances: {}
    });
});

test('éjszakás műszak, a következő nap munkaszüneti nap', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T22:00:00'),
        workEnd:       new Date('2026-09-29T07:00:00'),
        scheduleStart: new Date('2026-09-28T22:00:00'),
        scheduleEnd:   new Date('2026-09-29T06:00:00'),
        dayType:       'workday',
        nextDayType:   'holiday',
        isShiftWorker: true,
        isOrdered:     true,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 540,
        premiumOutsideMinutes: 60,
        allowances: { '30': 480, '200': 60 }
    });
});

test('pénteki éjszakás műszak, a túlóra szombatra esik', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-10-02T22:00:00'),
        workEnd:       new Date('2026-10-03T08:00:00'),
        scheduleStart: new Date('2026-10-02T22:00:00'),
        scheduleEnd:   new Date('2026-10-03T06:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: true,
        isOrdered:     true,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 600,
        premiumOutsideMinutes: 120,
        allowances: { '30': 480, '100': 120 }
    });
});

test('szombati éjszakás műszak, a túlóra vasárnapra esik', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-10-03T22:00:00'),
        workEnd:       new Date('2026-10-04T08:00:00'),
        scheduleStart: new Date('2026-10-03T22:00:00'),
        scheduleEnd:   new Date('2026-10-04T06:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: true,
        isOrdered:     true,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 600,
        premiumOutsideMinutes: 120,
        allowances: { '100': 480, '200': 120 }
    });
});

test('délutános műszak egy órás elrendelt túlórával', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T14:00:00'),
        workEnd:       new Date('2026-09-28T23:00:00'),
        scheduleStart: new Date('2026-09-28T14:00:00'),
        scheduleEnd:   new Date('2026-09-28T22:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: true,
        isOrdered:     true,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 540,
        premiumOutsideMinutes: 60,
        allowances: { '15': 240, '50': 60 }
    });
});

test('éjszakás műszak egy órával korábbi, elrendelt kezdéssel', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T21:00:00'),
        workEnd:       new Date('2026-09-29T06:00:00'),
        scheduleStart: new Date('2026-09-28T22:00:00'),
        scheduleEnd:   new Date('2026-09-29T06:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: true,
        isOrdered:     true,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 540,
        premiumOutsideMinutes: 60,
        allowances: { '50': 60, '30': 480 }
    });
});

test('pihenőnapon végzett munka', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T08:00:00'),
        workEnd:       new Date('2026-09-28T12:00:00'),
        scheduleStart: new Date('2026-09-28T08:00:00'),
        scheduleEnd:   new Date('2026-09-28T12:00:00'),
        dayType:       'restday',
        nextDayType:   'workday',
        isShiftWorker: true,
        isOrdered:     true,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 240,
        premiumOutsideMinutes: 0,
        allowances: { '100': 240 }
    });
});

test('munkaszüneti napon végzett munka', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-29T06:00:00'),
        workEnd:       new Date('2026-09-29T14:00:00'),
        scheduleStart: new Date('2026-09-29T06:00:00'),
        scheduleEnd:   new Date('2026-09-29T14:00:00'),
        dayType:       'holiday',
        nextDayType:   'workday',
        isShiftWorker: true,
        isOrdered:     true,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        premiumOutsideMinutes: 0,
        allowances: { '200': 480 }
    });
});

test('vasárnapi munkavégzés', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-10-04T08:00:00'),
        workEnd:       new Date('2026-10-04T16:00:00'),
        scheduleStart: new Date('2026-10-04T08:00:00'),
        scheduleEnd:   new Date('2026-10-04T16:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: true,
        isOrdered:     true,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        premiumOutsideMinutes: 0,
        allowances: { '200': 480 }
    });
});

test('nem műszakos dolgozó a délutáni sávban, pótlék nélkül', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T14:00:00'),
        workEnd:       new Date('2026-09-28T22:00:00'),
        scheduleStart: new Date('2026-09-28T14:00:00'),
        scheduleEnd:   new Date('2026-09-28T22:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: false,
        isOrdered:     false,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        premiumOutsideMinutes: 0,
        allowances: {}
    });
});

test('fizetett szünet, a ledolgozott időbe beleszámít', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T08:00:00'),
        workEnd:       new Date('2026-09-28T16:00:00'),
        scheduleStart: new Date('2026-09-28T08:00:00'),
        scheduleEnd:   new Date('2026-09-28T16:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: false,
        isOrdered:     false,
        breakMinutes:  30,
        breakPaid:     true
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        premiumOutsideMinutes: 0,
        allowances: {}
    });
});

test('beosztáson kívüli munkavégzés elrendelés nélkül, nincs pótlék', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-10-05T22:00:00'),
        workEnd:       new Date('2026-10-06T06:00:00'),
        scheduleStart: new Date('2026-10-05T07:00:00'),
        scheduleEnd:   new Date('2026-10-05T15:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: false,
        isOrdered:     false,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        premiumOutsideMinutes: 0,
        allowances: {}
    });
});

test('ugyanaz a munkavégzés elrendelve, hétköznapi túlóra', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-10-05T22:00:00'),
        workEnd:       new Date('2026-10-06T06:00:00'),
        scheduleStart: new Date('2026-10-05T07:00:00'),
        scheduleEnd:   new Date('2026-10-05T15:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: false,
        isOrdered:     true,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        premiumOutsideMinutes: 480,
        allowances: { '50': 480 }
    });
});

test('nem műszakos dolgozónál a szombat éjfélkor kezdődik', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-10-09T22:00:00'),
        workEnd:       new Date('2026-10-10T06:00:00'),
        scheduleStart: new Date('2026-10-09T07:00:00'),
        scheduleEnd:   new Date('2026-10-09T15:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: false,
        isOrdered:     false,
        breakMinutes:  0,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        premiumOutsideMinutes: 360,
        allowances: { '100': 360 }
    });
});

test('időponttal megadott szünet a pótlékból is kimarad', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T22:00:00'),
        workEnd:       new Date('2026-09-29T06:00:00'),
        scheduleStart: new Date('2026-09-28T22:00:00'),
        scheduleEnd:   new Date('2026-09-29T06:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: true,
        isOrdered:     false,
        breakStart:    new Date('2026-09-29T02:00:00'),
        breakEnd:      new Date('2026-09-29T02:30:00'),
        breakMinutes:  30,
        breakPaid:     false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 450,
        premiumOutsideMinutes: 0,
        allowances: { '30': 450 }
    });
});

test('fizetett szünet időponttal is beleszámít a pótlékba', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T22:00:00'),
        workEnd:       new Date('2026-09-29T06:00:00'),
        scheduleStart: new Date('2026-09-28T22:00:00'),
        scheduleEnd:   new Date('2026-09-29T06:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: true,
        isOrdered:     false,
        breakStart:    new Date('2026-09-29T02:00:00'),
        breakEnd:      new Date('2026-09-29T02:30:00'),
        breakMinutes:  30,
        breakPaid:     true
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        premiumOutsideMinutes: 0,
        allowances: { '30': 480 }
    });
});