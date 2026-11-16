# 4. fejezet, 1. csoport — Felhasználó- és jogosultságkezelés

Beilleszthető anyag: a törzsanyagi táblázat hat sora, valamint a hozzá tartozó
két melléklet sorai. Az eredeti hat követelmény 10 873 karakter, az új
törzsanyagi rész 3 150 karakter, a maradék a két mellékletbe kerül.

## Hogyan hivatkozzunk

A hivatkozás oszlopban végig a dolgozat saját pontjaira utalunk, nem ismételjük
meg a szabályt. Három irányba hivatkozunk:

- **2.x** — az üzleti igény, vagyis honnan jön a követelmény;
- **6.x** — az adatmodell, amely a követelményt tárolja;
- **7.x / 8.x** — a felület és a megvalósítás, ahol a viselkedés részletesen
  szerepel.

Egy fontos óvatosság: a 6.5 alfejezet egyedtáblázatai **át fognak számozódni**,
amikor a PayrollCodes és a ShiftRotations bekerül. Ezért a hivatkozás ne
„6.5.2" legyen, hanem **„6.5 (Permissions)"**, vagyis az alfejezet száma és az
egyed neve. Ez a beszúrástól független, és a kereszthivatkozás sem törik el.

## Törzsanyagi táblázat — az 1. csoport sorai

A csoportcím átmenő fejlécsorként marad, utána a hat követelmény.

**1. Felhasználó- és jogosultságkezelés**

| Azonosító | Követelmény megnevezése | Szereplő | A követelmény tartalma | Hivatkozás |
|---|---|---|---|---|
| F-1.1 | Szerepkör-alapú hozzáférés-vezérlés | Rendszer | A rendszer négy szerepkört különböztet meg, és a magasabb szintű szerepkör örökli az alacsonyabb funkcióit, ezért a felhasználó egyetlen felületet lát, szerepkörváltás nélkül. Azt, hogy a felhasználó mit tehet, a szerepkörhöz rendelt jogosultsági mátrix dönti el, azt pedig, hogy kinek az adatán, a szervezeti kapcsolat. A jogosultságok adatban vannak nyilvántartva, ezért új jogosultság bevezetése adatfelvétel, nem programmódosítás. | 2.3.4; 6.5 (Permissions, RolePermissions); 8.3.5; 8.3.6 |
| F-1.2 | Dolgozói nyilvántartás és felhasználói fiókok kezelése | HR-bér | Minden munkavállalóról nyilvántartás készül, felhasználói fiókot azonban csak az kap, akinek van vállalati e-mail címe; a többi munkavállaló munkaidejét a csoport vezetője rögzíti. Minden dolgozónál kötelező a csoport vagy a közvetlen felettes megadása, hogy legalább egy vezető hatókörébe tartozzon, felettesnek pedig csak aktív, vezetői szerepkörű munkavállaló jelölhető. A dolgozói kódot a rendszer adja ki, egyedi, egyszer kerül kiadásra, és a szervezeti besorolástól független. A fiók generált kezdeti jelszóval és kötelező jelszócserével jön létre. | 2.3.4; 6.5 (Employees, Users); 7.7.1 |
| F-1.3 | Szervezeti felépítés és csoportok kezelése | Admin | A szervezet fa szerkezetű: a területek egymásba ágyazhatók, alattuk részlegek, azok alatt műszakok állnak, és egy szervezeti egységhez legfeljebb egy csoport tartozhat. A csoport vezetője nem külön megadandó adat, hanem a szervezeti egységtől öröklődik; ha az egységnek nincs saját vezetője, a rendszer a fában fölfelé a legközelebbi vezetőt veszi, a vezető cseréjekor pedig újraszámolja az érintett csoportokat. Egy vezető egyidejűleg egyetlen szervezeti egységet vezethet, és vezetőnek csak aktív, vezetői szerepkörű munkavállaló jelölhető. A szervezet megtekintésére a HR-bér szerepkör is jogosult, módosítására nem. | 2.3.4; 6.3.3; 6.5 (Areas, Departments, Shifts, UserGroups); 7.7.2 |
| F-1.4 | Törzsadatok kezelése | Admin | A rendszer működését meghatározó törzsadat a felületről karbantartható, adatbázis-szintű beavatkozás nélkül: a munkarend, a napi munkaidő, a törzsidő, a költséghely, a bérkód, a távolléti jogcím és a pótlék. A törzsidő a napi munkaidő alá rendelt adat, mert a dolgozóhoz csak olyan törzsidő választható, amelynek hossza a beállított napi óraszámmal megegyezik. A távolléti jogcím határozza meg, hogy a távollét fizetett-e, igényel-e jóváhagyást, mely munkarendekben vehető igénybe, és milyen bérkóddal kerül a bérfeladásba. Hivatkozott törzsadat nem törölhető; jogcím esetén a megoldás az inaktiválás, így a korábban rögzített munkaidő-adatok értelmezhetők maradnak. | 2.3.1.1; 2.3.1.2; 2.3.1.3; 2.3.2.1; 6.5 (WorkSchedules, WorkingHours, CoreHours, PayrollCodes, Absences, Allowances); 7.7.3; 8.4.10 |
| F-1.5 | Fiókzárolás sikertelen belépések után | HR-bér | Három egymást követő hibás jelszó után a rendszer zárolja a fiókot, és onnantól helyes jelszóval sem használható. A zárolás nem jár le magától: a feloldás a HR vagy az adminisztrátor döntése, mert az időalapú feloldás a próbálkozót csak várakozásra kényszerítené, a kézi feloldás viszont biztosítja, hogy a munkáltató tudomást szerezzen a zárolásról. Sikeres bejelentkezés nullázza a számlálót, tehát a korábbi elvétett próbálkozások nem halmozódnak, a jelszó újragenerálása pedig egyben feloldja a zárolást. | 6.5 (Users); 7.7.1; 8.3.1 |
| F-1.6 | Csoporttulajdonságok öröklése a dolgozóra | Rendszer | A munkarend, a napi óraszám és a törzsidő egyszer, a csoportnál adható meg; a dolgozónál csak akkor kell kitölteni, ha az adott munkavállaló eltér a csoportjától, vagy ha egyáltalán nincs csoportja, ami tipikusan a vezetők esete. Az elv ugyanaz, mint a beosztás feloldásánál: a konkrétabb adat megelőzi az általánosabbat. Az öröklést a rendszer egyetlen adatbázis-nézetben mondja ki, és minden erre épülő lekérdezés ezt használja, így a szabály nem ismétlődik a programkódban. A munkaközi szünet nem öröklődik, mert munkavállalónként eltérhet. | 2.3.1.2; 6.1 (EmployeeSettings nézet); 8.4.2 |

## Mi került ki és hová

| Eredeti szakasz | Sorsa |
|---|---|
| Bemenő adatok (F-1.4, F-1.5, F-1.6 alatt) | Törölve. A kezelt adatok a 6.5 attribútumtáblázataiból egy az egyben kiolvashatók |
| Üzleti szabály | A tartalom oszlopba tömörítve, a 2.x hivatkozással |
| Rendszerviselkedés | A tartalom oszlopba tömörítve; a részletes leírás a 7.x és 8.x pontokban van |
| Validációs korlát és a HTTP-válaszok | **1. melléklet** |
| Ellenőrzés (teszteset-nevek) | **2. melléklet** |

## 1. melléklet — Validációs korlátok és elutasítási esetek

A melléklet bevezetője egy mondat: „A táblázat követelményenként rögzíti, hogy a
rendszer mely esetben tagadja meg a műveletet, és milyen HTTP-státuszkóddal."

| Azonosító | A rendszer mit nem engedélyez |
|---|---|
| F-1.1 | Minden védett végpont és menüpont megnevezett jogosultsági kulcsot követel meg, amelyet a kiszolgáló ellenőriz. Token nélkül a válasz 401, hiányzó jogosultság esetén 403. Az Admin szerepkör minden kulcsot megkap, és a jogosultsági mátrix szerkesztésekor sem veszítheti el őket. |
| F-1.2 | Kötelező adat a név, a költséghely, az állománycsoport, a státusz, a munkarend, a napi munkaidő és az éves szabadságkeret. Hiányos adat és nem vezetői szerepkörű felettes esetén a válasz 400. Vállalati e-mail cím nélküli dolgozóhoz, illetve második fiók létrehozásakor 409. A saját és az utolsó aktív Admin fiók nem tiltható le és nem törölhető. Dolgozó csak akkor törölhető, ha nem tartozik hozzá munkaidő-adat, kérelem, fiók és beosztott. |
| F-1.3 | Olyan szervezeti láncra, amelyben sehol nincs vezető, csoport nem hozható létre, és nem vezetői szerepkörű vezető sem adható meg; mindkét esetben 400 a válasz. A terület önmaga vagy saját leszármazottja alá nem rendelhető, és nem törölhető olyan egység, amely alatt részleg, műszak vagy csoport van; ezekre 409 a válasz. |
| F-1.4 | A kötelező mezők üresen nem hagyhatók, a napi óraszám egy és tizenkettő között vehet fel értéket az Mt. 99. § (2) bekezdéséhez igazodva, az időpontokat óra:perc alakban kell megadni. Az egyediséget az adatbázis őrzi: azonos óraszám, azonos munkarendnév, azonos költséghely-kód, azonos jogcímnév és azonos bérkód nem fordulhat elő kétszer. Munkarend megjelölése nélkül a jogcím nem menthető. Hivatkozott törzsadat törlésekor a rendszer megnevezi, hány hivatkozás akadályozza a műveletet. A Betegség és a Fizetett szabadság jogcímet a riport statisztikai nézete a megnevezése alapján azonosítja, ezért a felület átnevezés előtt figyelmeztet. |
| F-1.5 | Hibás jelszó esetén a válasz 401, a harmadik próbálkozástól és onnantól minden további kísérletnél 423, helyes jelszóval is. A hibaüzenet nem árulja el, hogy a felhasználónév vagy a jelszó volt-e hibás. A zárolás a bejelentkezés legelső ellenőrzése, tehát zárolt fióknál a jelszó összehasonlítása el sem indul. |
| F-1.6 | A munkarend, a napi munkaidő és a törzsidő megadása csak akkor kötelező, ha a dolgozóhoz nincs csoport rendelve; csoport esetén üresen hagyható. Hiányzó adat esetén a válasz 400. A dolgozói adatlap a munkavállaló saját értékeit mutatja és menti, nem az örökölt eredményt, különben a mentés rámásolná a csoport értékét a dolgozóra, és az öröklés észrevétlenül megszűnne. |

## 2. melléklet — Követelmény és teszteset megfeleltetése

A melléklet bevezetője két mondat: „A táblázat követelményenként megadja az
igazoló teszteseteket. A végponti tesztek a Bruno gyűjtemény sorszámozott
esetei, a hivatkozott nevek a gyűjteményben szerepelnek."

| Azonosító | Végponti teszt (Bruno) | Egységteszt | Adatbázis-ellenőrzés |
|---|---|---|---|
| F-1.1 | 04 profil token nelkul (401), 05 profil ervenytelen tokennel (403), 109 dolgozoi lista vezetoi fiokkal (403), 171 torzsadat dolgozoi fiokkal (403) | jogosultsagi-kulcsok: a használt kulcsok léteznek az adatbázisban; minden fül szintű jogosultságot ellenőriz a szerveroldal | – |
| F-1.2 | 110 dolgozo felvetele hianyos adattal (400), 111 dolgozo felvetele (201), 112 fiok letrehozasa email nelkul (409), 115 fiok letrehozasa ismetelten (409), 126 sajat fiok tiltasa (409), 128 dolgozo torlese meglevo fiokkal (409) | – | – |
| F-1.3 | 143 szulo terulet letrehozasa (201), 145 terulet onmaga felettese (409), 146 terulet sajat leszarmazottja ala (409), 101 terulet torlese reszleggel (409), 150 csoport vezeto nelkuli csomoponthoz (400), 151 szervezeti egyseg nem vezetoi vezetovel (400), 139 csoport torlese dolgozoval (409), 138 dolgozo hozzaadasa csoporthoz (200) | – | 6. teszt: a vezetői hatókör lekérdezése |
| F-1.4 | 156 munkarend letrehozasa (201), 157 munkarend ismetelt letrehozasa (409), 160 napi munkaido ervenytelen oraszammal (400), 189 napi munkaido tizenket oranal tobb (400), 164 torzsido hibas idoponttal (400), 167 koltseghely ismetelt koddal (409), 169 hasznalatban levo torzsadat torlese (409), 173 jogcim munkarend nelkul (400), 174 jogcim foglalt berkoddal (409), 179 hasznalatban levo jogcim torlese (409) | potlekszamitas: a műszakpótlék sávja a törzsadatból jön, nem a kódból | – |
| F-1.5 | 183 zarolas elso hibas probalkozas (401), 184 zarolas masodik hibas probalkozas (401), 185 zarolas harmadik hibas probalkozas (423), 186 zarolt fiok helyes jelszoval (423), 187 zarolas feloldasa (200), 188 bejelentkezes feloldas utan (200) | – | – |
| F-1.6 | 191 dolgozo felvetele csoporttal orokolt adatokkal (201), 192 orokolt munkarend a havi nezetben (200), 110 dolgozo felvetele hianyos adattal (400) | – | – |

## Egy javítás, amit menet közben találtam

Az eredeti F-1.4 szövege a távolléti jogcím **kategóriájára** hivatkozik
(„a kategória csak a rendszer által ismert négy érték egyike lehet"), és az
ellenőrzésnél a `jogcim ervenytelen kategoriaval` tesztesetet említi. Az
`absence_category` oszlop és a hozzá tartozó teszt is megszűnt, ezért a fenti
szövegből mindkettő kimaradt, helyette a bérkód egyediségét igazoló
`174 jogcim foglalt berkoddal` teszteset szerepel. Ugyanez a hiba a 6. fejezet
27. táblázatában is benne van, ott is javítandó.

Szintén kimaradt az eredetiből az az állítás, hogy a jogcímek
„jelenlegi törzsadata mindegyiket minden munkarendhez rendeli" — ez igaz, de a
törzsadat tartalma a 6.1.4 pont dolga, nem a követelményé.

## Oldalszám

Az első csoport törzsanyagban körülbelül **egy oldal** lesz a mostani
hét-nyolc helyett. A hat követelmény mellékletbe kerülő része 4 300 karakter,
ami a két mellékletben együtt másfél oldal.
