const NAME_PARTS = ['title', 'last_name', 'first_name', 'middle_name'];

const nameColumns = (alias, prefix) => NAME_PARTS
    .map((part) => (prefix
        ? `${alias}.employee_${part} AS ${prefix}_${part}`
        : `${alias}.employee_${part}`))
    .join(', ');

const fullName = (row, prefix = 'employee') => NAME_PARTS
    .map((part) => row[`${prefix}_${part}`])
    .filter(Boolean)
    .join(' ');

module.exports = { nameColumns, fullName };
