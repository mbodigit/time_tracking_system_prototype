const PENDING = 'Függőben';
const IN_PROGRESS = 'Folyamatban';
const APPROVED = 'Jóváhagyva';
const REJECTED = 'Elutasítva';
const WITHDRAWN = 'Visszavonva';

const COVERING = [APPROVED, IN_PROGRESS];
const ACTIVE = [PENDING, APPROVED, IN_PROGRESS];

const toSqlList = (statuses) => statuses.map((s) => `'${s}'`).join(', ');

const COVERING_SQL = toSqlList(COVERING);
const ACTIVE_SQL = toSqlList(ACTIVE);

const isCovering = (status) => COVERING.includes(status);

module.exports = {
    PENDING,
    IN_PROGRESS,
    APPROVED,
    COVERING_SQL,
    ACTIVE_SQL,
    isCovering
};
