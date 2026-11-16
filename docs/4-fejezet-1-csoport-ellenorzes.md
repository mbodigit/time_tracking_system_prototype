# F-1.1 … F-1.6 — megvalósulás ellenőrzése a kódban

Ellenőrzés dátuma: 2026-11-16. Minden állítást a `backend/src` és a
`frontend/src` tartalmán néztem meg, nem a teszteken.

Összegzés: **a hat követelmény 38 ellenőrizhető állítása közül 35 teljesül
kódban és felületen is, 3 nem úgy, ahogy a dolgozatban szerepel.** A három
eltérés mindegyike ugyanabba a csoportba tartozik: a szabály a felületen
érvényesül, a kiszolgálón nem, vagy egyáltalán nincs megvalósítva.

---

## F-1.1 Szerepkör-alapú hozzáférés-vezérlés — teljesül

| Állítás | Megvalósulás |
|---|---|
| Négy szerepkör | `db/install/01_jogosultsag_DML.sql`: Admin, Vezető, HR-Bér, Dolgozó |
| Örökölt jogosultság, nincs szerepkörváltás a felületen | `frontend/src/components/layout/layout.tsx` a menüt a jogosultsági kulcsokból állítja elő (`utils/access.ts` → `canOpenPage`), nincs szerepkör-választó |
| „Mit tehet" = jogosultsági mátrix | `middlewares/authMiddleware.js` → `hasPermission()` a `RolePermissions` táblából olvas |
| „Kinek az adatán" = szervezeti kapcsolat | `services/employeeScope.js` a vezetői hatókört adatbázis-relációkból oldja fel |
| Jogosultság adatban, új kulcs = adatfelvétel | `services/permissions.js` + `Permissions` tábla; nincs kódba írt szerepkörlista |
| Minden védett végpont megnevezett kulcsot követel | 54 végpontot átnéztem: mindegyiken van `authorizePermission`. A törzsadat-végpontok a `routes/masterDataRoutes.js` `authorizeEntity` függvényén keresztül kapják meg az entitáshoz tartozó kulcsot. Kulcs nélkül csak a `/login`, a `/me` és a `/me/password` fut, ami helyes |
| Az Admin minden kulcsot megkap | `authMiddleware.js` `hasPermission()`: `if (role === 'Admin') return true`. A jogosultsági lapon az Admin jelölőnégyzetei tiltottak, így nem is vehető el tőle |
| Token nélkül 401 | `authMiddleware.js`: hiányzó, hibás formátumú és üres token esetén is 401 |
| Hiányzó jogosultság esetén 403 | `authorizePermission` 403-at ad, naplózza a szerepkört és a kulcsot |

Megjegyzés a dolgozat szövegéhez: **érvénytelen vagy lejárt token esetén a válasz
403**, nem 401 (`authMiddleware.js`). Ez a mellékletben így is szerepel, tehát
nem hiba, de érdemes tudni, hogy a két eset szándékosan különbözik: nincs token
= 401, van token de rossz = 403.

---

## F-1.2 Dolgozói nyilvántartás és fiókok — egy eltérés

| Állítás | Megvalósulás |
|---|---|
| Fiók csak vállalati e-mail címmel | `employeeAdminController.js` `createUser`: e-mail nélkül 409. A felület eleve csak az e-mail címmel rendelkező, fiók nélküli dolgozókat listázza (`account-modal.tsx`) |
| Második fiók nem hozható létre | `createUser`: 409 |
| Fiók nélküli dolgozó munkaidejét a csoportvezető rögzíti | `routes/timeEntryRoutes.js` `/time-entries/daily` és `/bulk`, `time_log.group` kulccsal |
| Dolgozói kódot a rendszer adja ki, egyedi | `create`: `CompanySettings` sorának `FOR UPDATE` zárolása, majd `company_next_employee_code` ötjegyűre tömve |
| Csoport vagy közvetlen felettes kötelező | `validateEmployee`: egyik sem → 400, saját hibaszöveggel |
| Kötelező adatok | `validateEmployee`: vezetéknév, keresztnév, költséghely, állománycsoport, státusz, éves szabadságkeret **mindig**; munkarend, napi munkaidő és törzsidő **csak akkor, ha nincs csoport** |
| Generált kezdeti jelszó, kötelező csere | `createUser`: `generatePassword()`, `user_must_change_password = 1` |
| Szerepkör módosítható, jelszó újragenerálható, fiók letiltható, törölhető | `updateUser`, `removeUser` |
| Saját és utolsó aktív Admin fiók nem tiltható, nem törölhető | `updateUser` és `removeUser`: 409 mindkét esetre |
| Dolgozó csak akkor törölhető, ha nincs hozzá munkaidő, kérelem, fiók, beosztott | `remove`: a négy hivatkozást megszámolja, és a 409-es válaszban megnevezi, melyik akadályozza |

**Eltérés — a felettes szerepkörét a kiszolgáló nem ellenőrzi.**
A követelmény szerint „felettesnek csak aktív, vezetői szerepkörű munkavállaló
jelölhető". A felületen ez teljesül: az `options` végpont felettes-listája csak
aktív, `Vezető` szerepkörű felhasználóhoz tartozó dolgozókat ad vissza. A
`validateEmployee` viszont a `managerId`-t nem vizsgálja, csak azt, hogy van-e
egyáltalán csoport vagy felettes. Közvetlen API-hívással tehát beállítható
nem vezetői felettes.

Érdekes, hogy a szervezeti egységeknél ugyanez a szabály **be van építve**:
`orgController.js` `checkManager()` és `groupController.js` `prepare()` egyaránt
400-at ad nem vezetői vagy inaktív vezető esetén. A dolgozói felettesnél maradt
ki ugyanez.

Két lehetőség:
1. **Kódjavítás**, körülbelül tizenöt sor: a `validateEmployee` async változatában
   egy lekérdezés, amely a `managerId`-hez tartozó felhasználó állapotát és
   szerepkörét vizsgálja, és a meglévő mintát követve 400-at ad. Egy Bruno
   teszteset is kerülhet mellé (`dolgozo felvetele nem vezetoi felettessel`).
2. **A követelmény pontosítása**: a felettes-választás a felületen kötött
   listából történik, a kiszolgáló a szervezeti egységek vezetőjénél ellenőrzi a
   szerepkört.

Az első a tisztább, mert a követelmény szövegét nem kell gyengíteni, és
összhangba kerül a szervezeti egységek kezelésével.

---

## F-1.3 Szervezeti felépítés és csoportok — egy eltérés

| Állítás | Megvalósulás |
|---|---|
| Fa szerkezet, egymásba ágyazható területek | `Areas.area_parent_id`, `orgController.js` |
| Egy szervezeti egységhez legfeljebb egy csoport | `groupController.js` `prepare()` → `findGroupOnNode()`, 400 a meglévő csoport nevével |
| A csoport vezetője a szervezeti egységtől öröklődik | `groupController.js` `resolveManagerId()`: műszak → részleg → terület sorrendben |
| Ha nincs saját vezető, fölfelé a legközelebbi | `services/groupManagerSync.js` `nearestAreaManager()` rekurzívan jár fölfelé a területfában |
| Vezetőcserénél újraszámolás | `syncGroupManagers()`, amit az `orgController` módosítás után meghív, és a válaszban jelzi, hány csoport vezetője változott |
| Egy vezető egy szervezeti egységet vezethet | `orgController.js` `checkManager()`: a három szint `UNION ALL` lekérdezése, ütközésre 400 |
| Vezető csak aktív, vezetői szerepkörű | `checkManager()` és `prepare()` is ellenőrzi |
| Vezető nem törölhető, ha az egységhez csoport tartozik | `orgController.js` `update`: 409, mert a csoport vezetője innen öröklődik |
| Terület nem lehet önmaga vagy saját leszármazottja alá rendelve | `orgController.js` `update`: 409 mindkét esetre |
| Nem törölhető egység, amely alatt részleg, műszak vagy csoport van | `orgController.js` `remove`: 409 |
| Csoport nem törölhető, amíg aktív dolgozó tartozik hozzá | `groupController.js` `remove`: 409 |

**Eltérés — a HR-bér nem csak megtekinti, hanem módosítja is a szervezetet.**
A követelmény szerint „a szervezet megtekintésére a HR-bér szerepkör is
jogosult, módosítására nem". A valóságban az összes szervezeti végpont
ugyanazt az egyetlen `organisation` kulcsot kéri, olvasásra és írásra is
(`routes/orgRoutes.js`, `routes/groupRoutes.js`), a HR-Bér szerepkör pedig
megkapja ezt a kulcsot (`01_jogosultsag_DML.sql`). A felületen ugyanez:
`frontend/src/pages/org-page/org-page.tsx` az `canEdit` értékét szintén az
`organisation` kulcsból képzi, tehát a HR-nél is megjelennek a szerkesztő
gombok.

Vagyis ez az állítás jelenleg **sehol nem valósul meg** — sem a kiszolgálón, sem
a felületen.

Két lehetőség:
1. **Kódjavítás**: a kulcs szétválasztása olvasásra és írásra. Egy új
   `organisation.edit` jogosultsági sor a `Permissions` táblába, a hét írási
   végpont átállítása erre a kulcsra, a HR-Bér pedig csak az `organisation`
   kulcsot kapja meg. A felületen a `canEdit` az új kulcsot kérdezi. Nagyságrend:
   egy DML-sor, hét route-sor, egy frontend-sor. Következmény, hogy a 6. fejezet
   jogosultsági számai módosulnak: 28 helyett 29 jogosultság, a mátrix 46 helyett
   47 sor, és a HR-Bér marad 13 kulcson.
2. **A követelmény pontosítása**: a szervezet kezelése egyetlen jogosultsághoz
   kötött, amelyet az Admin és a HR-bér kap meg. Ez is védhető döntés, mert a
   szervezeti változások jellemzően HR-feladatok.

A második a gyorsabb, az első a szigorúbb. Itt nincs összhangsérelem más
funkcióval, tehát szerintem a követelmény pontosítása is teljesen rendben van —
de ezt neked kell eldöntened, mert ez üzleti szabály, nem technikai kérdés.

---

## F-1.4 Törzsadatok kezelése — egy eltérés

| Állítás | Megvalósulás |
|---|---|
| A törzsadat a felületről karbantartható | `masterDataController.js` entitásleírói: munkarend, napi munkaidő, törzsidő, költséghely; bérkód, jogcím és pótlék saját vezérlőkkel |
| Külön jogosultsági kulcs törzsadatkörönként | hét kulcs: `master_data.work_schedules`, `.working_hours`, `.core_hours`, `.cost_centers`, `.payroll_codes`, `.absences`, `.allowances` |
| A jogcím határozza meg a fizetettséget, a jóváhagyás szükségességét, a munkarendeket és a bérkódot | `Absences` tábla + `absenceAdminController.js` |
| Hivatkozott törzsadat nem törölhető, és a rendszer megnevezi a hivatkozásokat | `masterDataController.js` `remove`: az entitás `references` listája alapján számol, 409-ben felsorolja |
| Jogcímnél inaktiválás a megoldás | `absence_status`, a lista csak az aktívakat adja a választókhoz |
| Napi óraszám 1 és 12 között | adatbázis-szintű `chk_working_hour_num` |
| Egyediség: óraszám, munkarendnév, költséghely-kód, jogcímnév, bérkód | adatbázis-szintű `UNIQUE` kulcsok, a vezérlő `ER_DUP_ENTRY`-re 409-et ad |
| Átnevezési figyelmeztetés a Betegség és a Fizetett szabadság jogcímnél | `frontend/src/pages/master-data-page/absence-modal.tsx`, `isStatsAbsence` figyelmeztető sáv |

**Eltérés — a „törzsidő hossza = napi óraszám" szabály csak a felületen van.**
A követelmény szerint „a dolgozóhoz csak olyan törzsidő választható, amelynek
hossza a beállított napi óraszámmal megegyezik". Ez a szabály a
`frontend/src/pages/employees-page/employee-modal.tsx` egyetlen sorában
valósul meg: a törzsidő-lista a kiválasztott napi óraszámra szűr
(`options.coreHours.filter((item) => item.hours === workingHour.num)`).
Ugyanez a szűrés megvan a csoport szerkesztésénél is. A kiszolgáló viszont
semmit nem vizsgál: a `validateEmployee` és a `groupController.prepare()` sem
hasonlítja össze a törzsidő hosszát az óraszámmal.

Két lehetőség:
1. **Kódjavítás**, körülbelül húsz sor: a `coreHourLength()` segédfüggvény már
   létezik (`utils/dateHelpers.js`), tehát a mentés előtt a kiszolgáló
   kikérdezheti a választott törzsidőt és óraszámot, és eltérés esetén 400-at
   adhat. Ugyanaz a függvény szolgálja ki a felületi szűrést is, tehát a szabály
   egy helyen lenne kimondva.
2. **A követelmény pontosítása**: a hosszegyezést a felület biztosítja azzal,
   hogy csak az illeszkedő törzsidőket ajánlja fel.

Itt az elsőt javaslom, mert ez a szabály a munkaidő-számítás bemenetét védi: ha
egy nyolcórás dolgozóhoz hatórás törzsidő kerül, az a napi ledolgozandó óraszámot
rontja el, és onnantól minden havi egyenleg hibás lesz.

---

## F-1.5 Fiókzárolás — teljesül

| Állítás | Megvalósulás |
|---|---|
| Három egymást követő hibás jelszó után zárolás | `authController.js`: `MAX_FAILED_ATTEMPTS = 3`, a harmadiknál `user_locked_at` beállítása |
| Zárolt fiók helyes jelszóval sem használható | a zárolásvizsgálat a jelszó-összehasonlítás **előtt** fut, 423-at ad |
| A zárolás nem jár le magától | nincs időalapú feloldás a kódban |
| Feloldás a HR vagy az adminisztrátor dolga | `PATCH /admin/users/:id` az `employees.accounts` kulccsal; ezt a HR-Bér és az Admin kapja meg |
| Sikeres belépés nullázza a számlálót | `authController.js`: `user_failed_attempts = 0` |
| Jelszó újragenerálása feloldja a zárolást | `updateUser` `resetPassword` ága a számlálót és a zárolást is nullázza, és ezt a válaszüzenet is közli |
| A zárolt állapot megjelenik a dolgozói listában | `employees-page.tsx` „zárolva" jelvény, a lista rendezhető is rá; a fiókablakban magyarázó szöveg és „Zárolás feloldása" gomb |
| A hibaüzenet nem árulja el, melyik adat volt hibás | „Hibás felhasználónév vagy jelszó!" |

Egy pontosítás a melléklethez: a hibaüzenet **kiírja a hátralévő próbálkozások
számát** („Még 2 próbálkozása maradt a fiók zárolásáig"). Ez nem mond ellent a
követelménynek, de ha a mellékletben szerepel a viselkedés, érdemes ezt is
megemlíteni, mert vizsgán rá lehet kérdezni.

---

## F-1.6 Csoporttulajdonságok öröklése — teljesül

| Állítás | Megvalósulás |
|---|---|
| A munkarend, a napi óraszám és a törzsidő a csoportnál adható meg egyszer | `UserGroups` három hivatkozása |
| A dolgozónál csak eltérés vagy csoport nélküli eset esetén kötelező | `validateEmployee`: a három mező csak `groupId` nélkül kötelező |
| Az öröklést egyetlen helyen mondja ki a rendszer | `EmployeeSettings` nézet (`db/install/06_dolgozok_DDL.sql`), `COALESCE` a dolgozó és a csoport értéke között |
| Minden erre épülő lekérdezés a nézetet használja | hat helyen: `timeEntryController`, `services/monthlyReport`, `requestController`, `reportController`, `lookupController`, `groupController` |
| A dolgozói adatlap a saját értékeket mutatja és menti | `employeeAdminController` `list` és `update` a dolgozó saját oszlopait kezeli, nem a nézetet; a felületen a kitöltetlen mező helyőrzője „A csoporté" |
| A munkaközi szünet nem öröklődik | a `UserGroups` táblában nincs szünet-oszlop, a szünet csak az `Employees` sorban van |
| Hiányzó adat esetén 400 | `validateEmployee` |

---

## Összefoglalva, mit kell eldönteni

| # | Követelmény | Eltérés | Javaslatom |
|---|---|---|---|
| 1 | F-1.2 | A felettes vezetői szerepkörét a kiszolgáló nem ellenőrzi | Kódjavítás, ~15 sor, mert a szervezeti egységeknél már megvan ugyanez |
| 2 | F-1.3 | A HR-bér módosíthatja is a szervezetet, nem csak megtekintheti | Vagy új `organisation.edit` kulcs, vagy a követelmény pontosítása — üzleti döntés |
| 3 | F-1.4 | A törzsidő hossza és a napi óraszám egyezését csak a felület biztosítja | Kódjavítás, ~20 sor, mert hibás törzsidő minden havi egyenleget elvisz |

Mindhárom javítás külön ágon mehet. Szólj, melyiket kezdjük, és nyitom hozzá az
ágat.

## Egy mellékes, de tárgyi hiba a 6. fejezetben

A `6.5` Employees táblázatában az `employee_code` leírása szerint a kód
„a költséghely kódjából és sorszámból képződik", és a `6.10` pont is a
költséghely tábláját említi sorszámlálóként. A kód valójában **tisztán
sorszám**, ötjegyűre tömve (`00001`, `00002`), a számlálót a `CompanySettings`
tábla tárolja, és a kiadás a cégadatsor zárolásával történik. A dolgozói kód
tehát független a szervezeti besorolástól — ami egyébként pont az, amit a
`F-1.2` követelmény állít, szóval a követelmény helyes, a 6. fejezet leírása
nem.
