# 6. fejezet — javítási lista

Alap: `db/install/*.sql` (26 tábla + 1 nézet), 2026-11-14.

## A fejezet hiteles számai

| Mennyiség | Jelenleg a dolgozatban | Helyes érték |
|---|---|---|
| Tábla | 24 | **26** |
| Attribútum | 153 | **165** |
| Kötelező kitöltés (NOT NULL) | 92 | **97** |
| Elhagyható attribútum | – | 68 |
| Egyedi kulcs (UNIQUE) | 19 | **25** |
| Idegen kulcs (FOREIGN KEY) | 35 | **41** |
| Értékellenőrzés (CHECK) | 8 | **11** |
| Alapértelmezett érték | 22 | 22 (de más a tartalma) |
| Másodlagos index | 12 | **16** |
| Automatikusan növekvő kulcs | 24-ből 20 | **26-ból 22** |
| Nézet | – | **1 (EmployeeSettings)** |
| ON DELETE RESTRICT / CASCADE / SET NULL | 19 / 10 / 5 | **20 / 10 / 11** |

## Két új egyed, amely még nincs a fejezetben

- **PayrollCodes** — bérkódtörzs. A bérkód korábban szöveges oszlopként élt az
  Absences és az Allowances táblában, valamint a CompanySettings-ben; most önálló
  egyed, amelyre a két jogcímtábla idegen kulccsal hivatkozik.
- **ShiftRotations** — műszakrotáció. A rotációs pozíciókat és a hozzá tartozó
  törzsidőt tárolja, a csoport ebből kapja az aznapi műszakját.

Mindkettőhöz kell egy új alfejezet és egy új attribútumtáblázat a 6.5 alatt.
Ezzel a 6.5 utáni táblázatok sorszáma kettővel csúszik.

Javasolt elhelyezés:
- PayrollCodes a Távolléti jogcímek (Absences) **elé**, mert arra hivatkoznak;
- ShiftRotations a Törzsidő (CoreHours) **után**, mert arra hivatkozik.

### PayrollCodes attribútumai

| Tulajdonság neve | Adattípusa (hossza) | Kötelező | Leírás |
|---|---|---|---|
| payroll_code_id | INT (PK) | NOT NULL | Bérkód azonosítója |
| payroll_code | VARCHAR(20) UNIQUE | NOT NULL | A bérszámfejtő program által elvárt kód |
| payroll_code_name | VARCHAR(100) | NOT NULL | A bérkód megnevezése |
| payroll_code_is_base | BOOLEAN | NOT NULL | Ez a kód tartozik-e a ledolgozott alapórához |

### ShiftRotations attribútumai

| Tulajdonság neve | Adattípusa (hossza) | Kötelező | Leírás |
|---|---|---|---|
| shift_rotation_id | INT (PK) | NOT NULL | Rotációs elem azonosítója |
| shift_rotation_position | TINYINT UNIQUE | NOT NULL | A rotáció sorszáma, nulla vagy annál nagyobb |
| shift_rotation_core_hour_id | INT (FK – CoreHours.core_hour_id) UNIQUE | NOT NULL | A pozícióhoz tartozó törzsidő, egy törzsidő csak egy pozícióban szerepelhet |

## Szövegtörzs javítások

| Hely | Mi a hiba | Mire kell javítani |
|---|---|---|
| 6.1.1 Adattáblák definiálása, első bekezdés | „Az adatbázis 24 táblából áll" | 26 táblából |
| ugyanott | „Az első négy szkript hozza létre a séma szerkezetét" | hét DDL szkript hozza létre a szerkezetet, és ezek közül ötnek van adatfeltöltő párja |
| 6.2 Egyed-kapcsolat diagram | „24 egyedből és 153 attribútumból áll" | 26 egyedből és 165 attribútumból |
| 6.4 Relációs sémák, bevezető | „az alábbiakban a 24 tábla relációs sémája" | 26 tábla |
| 6.10 Automatikus növekmények, utolsó bekezdés | „A kód a költséghely kódjából és egy sorszámból képződik, a sorszámlálót pedig a költséghely táblája tárolja" | A kód növekvő sorszám, ötjegyűre tömve; a számlálót a cégadatok táblája tárolja (CompanySettings.company_next_employee_code), és a kiadás a cégadatsor zárolásával történik |
| 6.3 Önmagára hivatkozó kapcsolatok | a szöveg csak a csoportvezetőnél említi a körkörösséget | a terület, a részleg és a műszak vezetői oszlopa ugyanígy ALTER TABLE-lel kapja meg az idegen kulcsot, tehát négy ilyen utólagos megszorítás van |
| 6.1 vége | nincs említve a nézet | ki kell térni az EmployeeSettings nézetre: a csoportról a dolgozóra örökített munkarend, napi óraszám és törzsidő COALESCE-szel áll elő, így az öröklés egy helyen van leírva, nem minden lekérdezésben |

## 12. táblázat — Az adatbázis felépítésének lépései

Teljesen cserélendő, mert a szkriptek száma, neve és tartalma is más.

| Szkript | Mit tartalmaz | Tábla |
|---|---|---|
| 01_jogosultsag | Szerepkörök, jogosultságok, jogosultsági mátrix | 3 |
| 02_torzsadat | Törzsadat, amit az adminisztrátor ritkán módosít | 9 |
| 03_jogcimek | Bérkódok, távolléti jogcímek, pótlékok és kapcsolótábláik | 5 |
| 04_naptar | Globális naptár | 1 |
| 05_szervezet | Szervezet, tehát terület, részleg, műszak és csoport | 4 |
| 06_dolgozok | Dolgozók, felhasználói fiókok, a vezetői idegen kulcsok és az EmployeeSettings nézet | 2 |
| 07_mukodes | Működés, tehát a munkaidő és a kérelmek | 2 |
| 99_ellenorzes | Telepítés utáni ellenőrző lekérdezések | – |

Az első hét lépés mindegyike `_DDL` fájl, az 01, 02, 03, 04 és 06 lépéshez
tartozik `_DML` pár is, amely a törzsadatot tölti fel. A 99 lépés nem módosít
adatot, csak ellenőriz.

## 13. táblázat — Funkcionális követelmények megfeleltetése

Javítandó sorok:

| Követelmény | Jelenlegi (hibás) séma-elem | Helyes |
|---|---|---|
| Pótlékkulcsok tárolása a kódon kívül | Allowances.allowance_percent | Allowances.allowance_percent, allowance_start_hour, allowance_end_hour — a pótlék idősávja is adatbázisban van |
| Életkor és gyermekszám szerinti pótszabadság | employee_birth_date, employee_children_count | **A sor törlendő.** Az employee_children_count oszlop nincs többé, és a rendszer nem számol pótszabadságot; az éves keretet a HR rögzíti, amire már van külön sor |
| Bérkódok tárolása a programkódon kívül | Allowances.allowance_payroll_code, Absences.absence_payroll_code, CompanySettings.company_base_payroll_code | PayrollCodes tábla, Absences.absence_payroll_code_id, Allowances.allowance_payroll_code_id, PayrollCodes.payroll_code_is_base |

Felvehető új sorok:

| Követelmény | A séma megfelelő eleme |
|---|---|
| Műszakrotáció kezelése | ShiftRotations, user_group_rotation_position, user_group_rotation_start |
| A csoport beállításainak öröklése a dolgozóra | EmployeeSettings nézet |
| Jóváhagyás nélkül rögzíthető jogcím | Absences.absence_needs_approval |
| Nyitott végű távollét lezárása | Requests.request_closed_at |
| Fiókzárolás sorozatos hibás jelszó után | Users.user_failed_attempts, user_locked_at |

## 14. táblázat — A rendszerben kezelt adatok csoportosítása

A Törzsadat sor felsorolásából hiányzik a **bérkód** és a **műszakrotáció**.
Egyebekben helyes.

## 15. táblázat — A feltöltött törzsadat és annak forrása

| Törzsadat | Jelenlegi sor | Helyes sor | Megjegyzés javítása |
|---|---|---|---|
| Munkaszüneti napok | 11 | 11 | rendben |
| Pótlékkulcsok | 7 | **6** | „két műszakpótlék és öt túlórakulcs" → egy műszakpótlék (18:00–06:00, 30%) és öt túlórakulcs |
| Távolléti jogcímek | 16 | **14** | a feltöltött jogcímek száma; a fizetett, a nyitott végű és a jóváhagyást igénylő jelölő jogcímenként külön beállítható |
| Jogcím és munkarend kapcsolata | 44 | **42** | a megjegyzés már nem igaz: a feltöltés minden jogcímet minden munkarendhez hozzárendel (14 × 3), a munkarendenkénti szűkítés a felületen állítható |
| Munkarend és pótlék kapcsolata | 17 | **16** | „a két műszakpótlék" → a műszakpótlék csak a műszakos munkarendhez tartozik, az öt túlórakulcs mindegyikhez (3 × 6 − 2) |
| Napi óraszámok | 4 | 4 | rendben |
| Munkarendek | 3 | 3 | rendben |
| Törzsidő-sablonok | 4 | 4 | rendben |
| Dolgozói státuszok | 8 | 8 | rendben |
| Állománycsoportok | 2 | 2 | rendben |
| Szerepkörök | 4 | 4 | rendben |
| Jogosultságok | 29 | **28** | „Hat lap és huszonhárom funkció" → tíz lap és tizennyolc lapon belüli fül |
| Jogosultsági mátrix | 50 | **46** | „Admin 23, HR-bér 12, Vezető 10, Dolgozó 5" → Admin 22, HR-Bér 13, Vezető 8, Dolgozó 3 |

Új sorok:

| Törzsadat | Sor | Forrás | Megjegyzés |
|---|---|---|---|
| Bérkódok | 21 | bérszámfejtő program | A ledolgozott alapóra, a tizennégy távolléti jogcím és a hat pótlék kódja |
| Műszakrotáció | 3 | vállalati döntés | A három műszakhoz tartozó rotációs pozíciók |
| Költséghely | 1 | vállalati döntés | A rendszergazdai dolgozói rekordhoz szükséges egyetlen sor |

A táblázat utáni bekezdés („két törzsadatkör szándékosan üres maradt") pontosítása:
a költséghelyek közül egy sor feltöltésre kerül, a telephelyek maradnak üresen.

## 16. táblázat — A több a többhöz kapcsolatok

A három sor helyes. Egyetlen javítás: a Jogcím és munkarend sor indoklása a
HomeOffice jogcímre hivatkozik, ami a feltöltött jogcímek között nincs benne.
Javasolt megfogalmazás: „A fizetett szabadság minden munkarendben igényelhető,
a munkarendhez kötött jogcímek viszont csak a rájuk jogosult munkarendben".

## 18. táblázat — Permissions

**Törlendő sor:** `permission_route` — az oszlop nincs az adatbázisban, a felületi
útvonalat a kliens rendeli a jogosultsági kulcshoz.

## 23. táblázat — WorkLocations

- `work_location_address_line1` → **`work_location_address`** VARCHAR(150) NULL
- **Törlendő:** `work_location_address_line2`
- Az attribútumok száma 8 helyett 7.

## 25. táblázat — WorkingHours

A `working_hour_num` leírása: „Megengedett értéke 1 és 24 között" →
**1 és 12 között** (chk_working_hour_num).

## 27. táblázat — Absences

- **Törlendő:** `absence_category`, `absence_rec_type`
- `absence_payroll_code` VARCHAR(20) → **`absence_payroll_code_id`**
  INT (FK – PayrollCodes.payroll_code_id) UNIQUE, NULL
- **Új sor:** `absence_needs_approval` BOOLEAN NOT NULL — a jogcím kérelmet és
  jóváhagyást igényel-e; a betegség esetén nem
- Az attribútumok száma 9 helyett 8.

## 29. táblázat — Allowances

`allowance_payroll_code` VARCHAR(20) → **`allowance_payroll_code_id`**
INT (FK – PayrollCodes.payroll_code_id) UNIQUE, NULL.
A többi hat attribútum helyes.

## 31. táblázat — GlobalCalendar

`gl_cal_day_type` VARCHAR(50) → **ENUM(4 érték)**, és a leírás is:
„Munkaszüneti nap, Pihenőnap, Áthelyezett pihenőnap vagy Áthelyezett munkanap.
A felsorolás típusa zárja ki az elírt naptípust."

## 32. táblázat — CompanySettings

- **Törlendő:** `company_logo_url`
- **Törlendő:** `company_base_payroll_code` — az alapóra bérkódja a PayrollCodes
  táblába került, a `payroll_code_is_base` jelölővel
- Az attribútumok száma 7 helyett 5.

## 36. táblázat — UserGroups

Két új sor a végére:

| Tulajdonság neve | Adattípusa (hossza) | Kötelező | Leírás |
|---|---|---|---|
| user_group_rotation_position | TINYINT | NULL | A csoport helye a műszakrotációban. A két rotációs mező csak együtt adható meg |
| user_group_rotation_start | DATE | NULL | A rotáció kezdő hete. Ebből és az eltelt hetek számából áll elő az aznapi műszak |

Az attribútumok száma 12 helyett 14.

## 37. táblázat — Employees

- `employee_code` **leírása hibás**: „A költséghely kódjából és sorszámból
  képződik" → a kód tisztán sorszám, ötjegyűre tömve (00001, 00002), a
  számlálót a cégadatok tábla `company_next_employee_code` oszlopa tárolja, és
  a kiadás a cégadatsor zárolásával történik. Javasolt szöveg: „Dolgozó egyedi
  kódja. A rendszer adja ki növekvő sorszámként, és független a szervezeti
  besorolástól."
- **Törlendő:** `employee_children_count`, `employee_address_line2`,
  `employee_province`
- `employee_address_line1` → **`employee_address`** VARCHAR(150) NULL
- `employee_gender` VARCHAR(10) → **ENUM('Férfi','Nő','Egyéb')** NULL
- Az attribútumok száma 36 helyett 33.

## 38. táblázat — Users

- `user_employee_id` kötelezősége: **NULL**, nem NOT NULL. A kitöltést
  értékellenőrzés írja elő, amely egyetlen kivételt engedélyez: a rendszergazdai
  fiókot. A leírásba ez beírandó.
- Két új sor:

| Tulajdonság neve | Adattípusa (hossza) | Kötelező | Leírás |
|---|---|---|---|
| user_failed_attempts | TINYINT UNSIGNED | NOT NULL | Az egymást követő hibás bejelentkezések száma. Sikeres belépéskor nullázódik |
| user_locked_at | DATETIME | NULL | A fiók zárolásának időpontja, ha a hibás kísérletek száma elérte a határt |

Az attribútumok száma 7 helyett 9.

## 39. táblázat — WorkingTimeTracking

Helyes, mind a 15 attribútum szerepel. Egyetlen apróság: a `wtt_ordered_by`
leírásában „Az elrendelt kiadó vezető" → „Az elrendelést kiadó vezető".

## 40. táblázat — Requests

- `request_status` ENUM(4 érték) → **ENUM(5 érték)**: Függőben, **Folyamatban**,
  Jóváhagyva, Elutasítva, Visszavonva. A Folyamatban a nyitott végű távollét
  jóváhagyott, de még le nem zárt állapota
- **Új sor:** `request_closed_at` DATETIME NULL — a nyitott végű távollét
  lezárásának időpontja
- Az attribútumok száma 11 helyett 12.

## 41. táblázat — Az alkalmazott megszorítások típusonként

| Megszorítás típusa | Jelenlegi | Helyes |
|---|---|---|
| Kötelező kitöltés (NOT NULL) | 92 | **97** |
| Egyedi kulcs (UNIQUE) | 19 | **25** |
| Idegen kulcs (FOREIGN KEY) | 35 | **41** |
| Értékellenőrzés (CHECK) | 8 | **11** |

## 42. táblázat — Egyedi kulcsok

Hat új sor, ezzel 25 sor lesz:

| Tábla | Kulcs neve | Oszlopok |
|---|---|---|
| ShiftRotations | uq_shift_rotation_position | shift_rotation_position |
| ShiftRotations | uq_shift_rotation_core_hour | shift_rotation_core_hour_id |
| PayrollCodes | uq_payroll_code | payroll_code |
| Absences | uq_absence_payroll_code | absence_payroll_code_id |
| Allowances | uq_allowance_code | allowance_code |
| Allowances | uq_allowance_payroll_code | allowance_payroll_code_id |

A bérkódra mutató két egyedi kulcs azt zárja ki, hogy ugyanazt a bérkódot két
jogcím vagy két pótlék használja, mert akkor a bérfeladási export két különböző
tételt vinne fel ugyanarra a kódra.

## 43. táblázat — A törlési szabályok megoszlása

| Törlési szabály | Jelenlegi | Helyes |
|---|---|---|
| RESTRICT | 19 | **20** |
| CASCADE | 10 | 10 |
| SET NULL | 5 | **11** |

A SET NULL ugrása abból adódik, hogy a négy vezetői oszlop, a terület szülő-
hivatkozása és a két bérkód-hivatkozás is ilyen: ezek megszűnése nem
érvényteleníti magát a sort.

## 44. táblázat — A séma idegen kulcsai

Hét hiányzó sor, ezzel 41 sor lesz:

| Tábla | Megszorítás | Oszlop(ok) | Hivatkozott | Törléskor |
|---|---|---|---|---|
| Areas | fk_area_parent | area_parent_id | Areas(area_id) | SET NULL |
| Areas | fk_area_manager | area_manager_id | Users(user_id) | SET NULL |
| Departments | fk_department_manager | department_manager_id | Users(user_id) | SET NULL |
| Shifts | fk_shift_manager | shift_manager_id | Users(user_id) | SET NULL |
| ShiftRotations | fk_shift_rotation_core_hour | shift_rotation_core_hour_id | CoreHours(core_hour_id) | RESTRICT |
| Absences | fk_absence_payroll_code | absence_payroll_code_id | PayrollCodes(payroll_code_id) | SET NULL |
| Allowances | fk_allowance_payroll_code | allowance_payroll_code_id | PayrollCodes(payroll_code_id) | SET NULL |

Az Areas szülő-hivatkozása eddig is szerepelt a szövegben, a táblázatból viszont
kimaradt.

## 45. táblázat — Értékellenőrzések

Javítás:

| Megszorítás | Jelenlegi feltétel | Helyes |
|---|---|---|
| chk_working_hour_num | working_hour_num BETWEEN 1 AND 24 | working_hour_num BETWEEN 1 AND 12 |

Három új sor, ezzel 11 sor lesz:

| Tábla | Megszorítás | Mit jelent | Feltétel |
|---|---|---|---|
| ShiftRotations | chk_shift_rotation_position | A rotációs pozíció nem lehet negatív | shift_rotation_position >= 0 |
| UserGroups | chk_group_rotation_pair | A rotációs pozíció és a kezdő hét csak együtt adható meg | mindkettő NULL, vagy mindkettő kitöltött |
| Users | chk_user_employee_required | Fiók csak dolgozóhoz tartozhat, egyetlen kivétel a rendszergazda | user_employee_id IS NOT NULL OR user_username = 'admin' |

## 46. táblázat — Elsődleges kulcsok

Két új sor (PayrollCodes → payroll_code_id, egyszerű, igen; ShiftRotations →
shift_rotation_id, egyszerű, igen), ezzel 26 sor.

## 47. táblázat — Indexek

Négy hiányzó index, ezzel 16 sor:

| Tábla | Index neve | Oszlopok | Mire szolgál |
|---|---|---|---|
| Areas | idx_area_manager | area_manager_id | A területvezetőhöz tartozó szervezeti egységek visszakeresése a hatókör-szűréshez |
| Areas | idx_area_parent | area_parent_id | A szervezeti fa bejárása a részfa lekérdezésekor |
| Departments | idx_department_manager | department_manager_id | A részlegvezető hatókörének feloldása |
| Shifts | idx_shift_manager | shift_manager_id | A műszakvezető hatókörének feloldása |

## 48. táblázat — Alapértelmezett értékek

Törlendő három sor: `Absences.absence_category 'Egyéb'`,
`Absences.absence_rec_type 0`, `Employees.employee_children_count 0`.

Új három sor:

| Tábla | Attribútum | Alapértelmezés | Miért ez |
|---|---|---|---|
| PayrollCodes | payroll_code_is_base | 0 | Egy új bérkód alapból nem az alapóra kódja, ilyen csak egy van |
| Absences | absence_needs_approval | 1 | Új jogcím alapból kérelmet és jóváhagyást igényel |
| Users | user_failed_attempts | 0 | Új fióknál nincs hibás kísérlet |

A sorok száma így marad 22.

## 49. táblázat — Automatikus növekmények

Két új sor (PayrollCodes → payroll_code_id, ShiftRotations →
shift_rotation_id), ezzel 26 sor. A bevezető szövegben a „Négy táblánál ez
szándékosan nincs" állítás továbbra is helyes: a három kapcsolótábla és a
cégadatok táblája.

## 6.4 Relációs sémák — a felsorolás javítása

A következő sorok cserélendők, és kettő új sor kell:

```
Permissions permission_id, permission_key, permission_name, permission_parent_id,
  permission_is_group, permission_sort

WorkLocations work_location_id, work_location_name, work_location_code,
  work_location_country, work_location_postal_code, work_location_city,
  work_location_address

ShiftRotations shift_rotation_id, shift_rotation_position,
  shift_rotation_core_hour_id

PayrollCodes payroll_code_id, payroll_code, payroll_code_name,
  payroll_code_is_base

Absences absence_id, absence_name, absence_payroll_code_id, absence_is_paid,
  absence_is_open_ended, absence_needs_approval, absence_status, absence_sort

Allowances allowance_id, allowance_name, allowance_code,
  allowance_payroll_code_id, allowance_percent, allowance_start_hour,
  allowance_end_hour

CompanySettings company_settings_id, company_name, company_address,
  company_tax_number, company_next_employee_code

UserGroups user_group_id, user_group_name, user_group_status,
  user_group_description, user_group_area_id, user_group_department_id,
  user_group_shift_id, user_group_cost_center_id, user_group_work_schedule_id,
  user_group_working_hour_id, user_group_core_hour_id, user_group_manager_id,
  user_group_rotation_position, user_group_rotation_start

Employees employee_id, employee_code, employee_title, employee_first_name,
  employee_middle_name, employee_last_name, employee_birth_date,
  employee_birth_place, employee_gender, employee_country, employee_postal_code,
  employee_city, employee_address, employee_work_email, employee_private_email,
  employee_work_phone_num, employee_private_phone_num,
  employee_work_schedule_id, employee_working_hour_id, employee_core_hour_id,
  employee_core_start, employee_core_end, employee_break_minutes,
  employee_break_paid, employee_break_start, employee_break_end,
  employee_cost_center_id, employee_work_location_id, employee_category_id,
  employee_status_id, employee_user_group_id, employee_manager_id,
  employee_annual_leave_days

Users user_id, user_username, user_password_hash, user_employee_id, user_role_id,
  user_status, user_must_change_password, user_failed_attempts, user_locked_at

Requests request_id, request_employee_id, request_absence_id,
  request_start_date, request_end_date, request_message, request_status,
  request_decision_by, request_decision_at, request_decision_reason,
  request_created_at, request_closed_at
```

A többi tizenöt séma változatlan.

## Amit a 6. fejezeten kívül érdemes ellenőrizni

- A 2.3.2.1 pont tizenhat távolléti jogcímet sorol fel, a feltöltés tizennégyet
  tölt be: a **HomeOffice** és a **Csúszó nap** nincs az adatbázisban. Vagy a
  jogcímeket kell felvenni, vagy a 2. fejezetben kell jelezni, hogy a prototípus
  ezt a két jogcímet nem tartalmazza.
- A 2.3.1.3 pont két műszakpótlékot ír (18:00–22:00 15%, 22:00–06:00 30%), az
  adatbázisban egy kulcs van (18:00–06:00, 30%). A 6. fejezet most már a
  tényleges állapotot írja le, a 2. fejezetet kell ehhez igazítani.
- A 2.3.1.3 pont túlórakulcsai (100/200/300%) és az adatbázis kulcsai
  (50/100/200%) eltérnek. Az adatbázis a pótlék mértékét tárolja, a 2. fejezet a
  teljes díjazást — ezt egy mondatban tisztázni kell, különben ellentmondásnak
  tűnik.
- Az egyed-kapcsolat diagramok 2026-11-12-én újragenerálva, a két új egyeddel
  együtt, tehát a 7–12. ábra naprakész.
