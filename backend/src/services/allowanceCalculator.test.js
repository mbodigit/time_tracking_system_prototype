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
        breakMinutes:  30
    });

    assert.deepStrictEqual(result, {
        workedMinutes: 450,
        allowances: {}
    });
});
