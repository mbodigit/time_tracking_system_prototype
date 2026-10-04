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
        breakMinutes:  30,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 450,
        allowances: {}
    });
});

test('éjszakás műszak, a következő nap ünnepnap', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T22:00:00'),
        workEnd:       new Date('2026-09-29T07:00:00'),
        scheduleStart: new Date('2026-09-28T22:00:00'),
        scheduleEnd:   new Date('2026-09-29T06:00:00'),
        dayType:       'workday',
        nextDayType:   'holiday',
        isShiftWorker: true,
        breakMinutes:  0,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 540,
        allowances: { '30': 480, '300': 60 }
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
        breakMinutes:  0,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 600,
        allowances: { '30': 480, '200': 120 }
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
        breakMinutes:  0,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 600,
        allowances: { '200': 480, '300': 120 }
    });
});

test('délutános műszak egy órás túlórával', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T14:00:00'),
        workEnd:       new Date('2026-09-28T23:00:00'),
        scheduleStart: new Date('2026-09-28T14:00:00'),
        scheduleEnd:   new Date('2026-09-28T22:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: true,
        breakMinutes:  0,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 540,
        allowances: { '15': 240, '100': 60 }
    });
});

test('éjszakás műszak egy órával korábbi kezdéssel', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T21:00:00'),
        workEnd:       new Date('2026-09-29T06:00:00'),
        scheduleStart: new Date('2026-09-28T22:00:00'),
        scheduleEnd:   new Date('2026-09-29T06:00:00'),
        dayType:       'workday',
        nextDayType:   'workday',
        isShiftWorker: true,
        breakMinutes:  0,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 540,
        allowances: { '100': 60, '30': 480 }
    });
});

test('pihenőnapon végzett elrendelt munka', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-28T08:00:00'),
        workEnd:       new Date('2026-09-28T12:00:00'),
        scheduleStart: new Date('2026-09-28T08:00:00'),
        scheduleEnd:   new Date('2026-09-28T12:00:00'),
        dayType:       'restday',
        nextDayType:   'workday',
        isShiftWorker: true,
        breakMinutes:  0,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 240,
        allowances: { '200': 240 }
    });
});

test('munkaszüneti napon végzett elrendelt munka', () => {
    const result = calculateAllowances({
        workStart:     new Date('2026-09-29T06:00:00'),
        workEnd:       new Date('2026-09-29T14:00:00'),
        scheduleStart: new Date('2026-09-29T06:00:00'),
        scheduleEnd:   new Date('2026-09-29T14:00:00'),
        dayType:       'holiday',
        nextDayType:   'workday',
        isShiftWorker: true,
        breakMinutes:  0,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        allowances: { '300': 480 }
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
        breakMinutes:  0,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        allowances: { '300': 480 }
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
        breakMinutes:  0,
        breakPaid: false
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
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
        breakMinutes:  30,
        breakPaid:     true
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 480,
        allowances: {}
    });
});
