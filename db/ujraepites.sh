#!/usr/bin/env bash
set -euo pipefail

GYOKER="$(cd "$(dirname "$0")/.." && pwd)"
cd "$GYOKER"

if [ ! -f backend/.env ]; then
  echo "Nem talalom: backend/.env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
. backend/.env
set +a

export MYSQL_PWD="$DB_PASSWORD"
DB="${DB_NAME:-time_tracking_db_prototype}"
M=(mysql -u "$DB_USER" --default-character-set=utf8mb4)

echo "Adatbazis: $DB"
echo

echo "== 1. Kapcsolat ellenorzese"
"${M[@]}" -e "SELECT 1" > /dev/null
echo "   rendben"
echo

echo "== 2. Regi adatbazis eldobasa"
"${M[@]}" -e "DROP DATABASE IF EXISTS \`$DB\`; DROP DATABASE IF EXISTS time_tracking_db_uj;"
echo "   megtortent"
echo

echo "== 3. Telepito (db/install)"
for f in $(ls db/install/*.sql | grep -v _DQL); do
  echo "   $f"
  "${M[@]}" < "$f"
done
echo

echo "== 4. Demo adatok (db/demo)"
for f in db/demo/01-szervezet.sql db/demo/02-dolgozok.sql \
         db/demo/03-vezetok.sql db/demo/04-munkaido.sql; do
  echo "   $f"
  "${M[@]}" "$DB" < "$f" > /dev/null
done
echo

echo "== 5. Tesztadatok (db/fixtures)"
for f in db/fixtures/01-teszt-fiokok.sql db/fixtures/02-teszt-munkaido.sql; do
  echo "   $f"
  "${M[@]}" "$DB" < "$f" > /dev/null
done
echo

echo "== 6. Bruno reset"
"${M[@]}" "$DB" < db/fixtures/99-bruno-reset.sql > /dev/null
echo "   megtortent"
echo

echo "== 7. Ellenorzes"
"${M[@]}" "$DB" --table -e "
SELECT 'Areas' AS tabla, COUNT(*) AS sorok FROM Areas
UNION ALL SELECT 'Departments', COUNT(*) FROM Departments
UNION ALL SELECT 'Shifts', COUNT(*) FROM Shifts
UNION ALL SELECT 'UserGroups', COUNT(*) FROM UserGroups
UNION ALL SELECT 'Employees', COUNT(*) FROM Employees
UNION ALL SELECT 'Users', COUNT(*) FROM Users
UNION ALL SELECT 'WorkingTimeTracking', COUNT(*) FROM WorkingTimeTracking
UNION ALL SELECT 'Requests', COUNT(*) FROM Requests
UNION ALL SELECT 'GlobalCalendar', COUNT(*) FROM GlobalCalendar
UNION ALL SELECT 'Absences', COUNT(*) FROM Absences;"

echo
echo "== 8. Vezeto nelkuli DEMO csoport (urenek kell lennie)"
"${M[@]}" "$DB" --table -e "
SELECT user_group_name FROM UserGroups
WHERE user_group_manager_id IS NULL AND user_group_name LIKE 'DEMO %';"

echo
echo "== 9. Hianyos dolgozo (csak TESZT-D5 es a vezetok szerepelhetnek)"
"${M[@]}" "$DB" --table -e "
SELECT employee_code FROM Employees
WHERE employee_user_group_id IS NULL AND employee_manager_id IS NULL
ORDER BY employee_code;"

echo
echo "== 10. A Bruno kornyezetfajlba irando azonositok"
"${M[@]}" "$DB" --table -e "
SELECT employee_code AS kod, employee_id AS uj_azonosito FROM Employees
WHERE employee_code IN ('TESZT-VM1','TESZT-DM1','TESZT-D5','TESZT-K1')
ORDER BY employee_code;"

echo
echo "Kesz. A rendszergazda fiok: admin / admin (elso belepesnel jelszocsere)."
unset MYSQL_PWD
