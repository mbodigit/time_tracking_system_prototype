#!/usr/bin/env bash
set -euo pipefail

GYOKER="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FAJL="$GYOKER/backend/.env"

if [ ! -f "$ENV_FAJL" ]; then
  echo "Nem talalom: $ENV_FAJL"
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FAJL"
set +a

REGI="${DB_NAME:-time_tracking_db_prototype}"
UJ="${1:-time_tracking_db_uj}"
MUNKA="$(mktemp -d)"

mysql_fut() {
  mysql --host="$DB_HOST" --user="$DB_USER" --password="$DB_PASSWORD" \
        --default-character-set=utf8mb4 "$@"
}

echo "Regi adatbazis: $REGI"
echo "Uj adatbazis:   $UJ"
echo

echo "1/4  Az uj adatbazis ujraepitese"
mysql_fut -e "DROP DATABASE IF EXISTS \`$UJ\`;"

for f in $(ls "$GYOKER"/db/install/*.sql | grep -v '_DQL'); do
  echo "     $(basename "$f")"
  sed "s/time_tracking_db_prototype/$UJ/g" "$f" | mysql_fut
done

echo
echo "2/4  Semak kiirasa"

tablak() {
  mysql_fut --skip-column-names --batch -e \
    "SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = '$1' ORDER BY TABLE_NAME;"
}

sema_kiirasa() {
  local db="$1" kimenet="$2"
  : > "$kimenet"
  while read -r t; do
    [ -z "$t" ] && continue
    mysql_fut --skip-column-names --batch "$db" \
      -e "SHOW CREATE TABLE \`$t\`;" \
      | cut -f2- \
      | sed -e 's/ AUTO_INCREMENT=[0-9]*//g' -e 's/\\n/\n/g' \
      >> "$kimenet"
    echo "" >> "$kimenet"
  done < <(tablak "$db")
}

sema_kiirasa "$REGI" "$MUNKA/sema_regi.txt"
sema_kiirasa "$UJ"   "$MUNKA/sema_uj.txt"

echo
echo "3/4  Sema-kulonbsegek"
if diff -u "$MUNKA/sema_regi.txt" "$MUNKA/sema_uj.txt" > "$MUNKA/sema.diff"; then
  echo "     Nincs kulonbseg."
else
  echo "     KULONBSEG VAN:"
  cat "$MUNKA/sema.diff"
fi

echo
echo "4/4  Alkalmazas-torzsadat sorszamok"

sorszamok() {
  local db="$1"
  mysql_fut --skip-column-names --batch "$db" -e "
    SELECT 'UserRoles', COUNT(*) FROM UserRoles
    UNION ALL SELECT 'Permissions', COUNT(*) FROM Permissions
    UNION ALL SELECT 'RolePermissions', COUNT(*) FROM RolePermissions
    UNION ALL SELECT 'EmployeeStatus', COUNT(*) FROM EmployeeStatus
    UNION ALL SELECT 'EmployeeCategories', COUNT(*) FROM EmployeeCategories
    UNION ALL SELECT 'WorkSchedules', COUNT(*) FROM WorkSchedules
    UNION ALL SELECT 'WorkingHours', COUNT(*) FROM WorkingHours
    UNION ALL SELECT 'CoreHours', COUNT(*) FROM CoreHours
    UNION ALL SELECT 'Absences', COUNT(*) FROM Absences
    UNION ALL SELECT 'AbsenceWorkSchedules', COUNT(*) FROM AbsenceWorkSchedules
    UNION ALL SELECT 'Allowances', COUNT(*) FROM Allowances
    UNION ALL SELECT 'WorkScheduleAllowances', COUNT(*) FROM WorkScheduleAllowances
    UNION ALL SELECT 'GlobalCalendar', COUNT(*) FROM GlobalCalendar
    UNION ALL SELECT 'CompanySettings', COUNT(*) FROM CompanySettings;"
}

sorszamok "$REGI" > "$MUNKA/sorok_regi.txt"
sorszamok "$UJ"    > "$MUNKA/sorok_uj.txt"

if diff -u "$MUNKA/sorok_regi.txt" "$MUNKA/sorok_uj.txt" > "$MUNKA/sorok.diff"; then
  echo "     Minden tabla sorszama egyezik."
  cat "$MUNKA/sorok_uj.txt"
else
  echo "     KULONBSEG VAN (bal: $REGI, jobb: $UJ):"
  cat "$MUNKA/sorok.diff"
fi

echo
echo "A reszletes kimenet itt maradt: $MUNKA"
