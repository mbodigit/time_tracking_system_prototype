/**
 * Pótlékszámító
 *
 * Egy munkanap adataiból kiszámolja a ledolgozott perceket és azt,
 * hogy percenként melyik pótlékkulcs jár. Egy percre pontosan egy
 * pótlék jár, a kulcsok nem adódnak össze.
 *
 * Bemenet (egy objektum):
 *   workStart       Date    a munkavégzés kezdete
 *   workEnd         Date    a munkavégzés vége
 *   scheduleStart   Date    a beosztás szerinti kezdés
 *   scheduleEnd     Date    a beosztás szerinti vég
 *   dayType         'workday' | 'restday' | 'holiday'   a kezdőnap típusa
 *   nextDayType     'workday' | 'restday' | 'holiday'   a következő napé
 *   isShiftWorker   boolean
 *   breakMinutes    number  a levonandó szünet percben
 *
 * Kimenet:
 *   workedMinutes   number  a ledolgozott idő szünet nélkül
 *   allowances      objektum, kulcs a pótlék százaléka, érték a percszám
 *                   pl. { '30': 480 }
 */
const calculateAllowances = () => {
    const times = {
        workedMinutes: 0,
        allowances: {}
    };
    return times;
}

module.exports = {calculateAllowances}