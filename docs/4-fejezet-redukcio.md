# 4. fejezet — terjedelem csökkentése 46 oldalról ~7 oldalra

## Miért 46 oldal

A fejezet táblázatai együtt körülbelül **59 600 karaktert** tartalmaznak, ami
normál táblázatos szedéssel 20–21 oldal lenne. A tényleges 46 oldal tehát nem
csak a szövegmennyiség miatt jön össze, hanem a **szerkezet** miatt is:

- az öt funkcionális táblázat **egyoszlopos**, vagyis minden követelmény egyetlen
  hosszú szövegblokk egy cellában;
- a blokkon belül minden felsoroláselem külön sorba kerül, így egy követelmény
  20–35 sort foglal;
- a cellák nem tölthetők be oldalhatáron, ezért sok félig üres oldal keletkezik.

Ez önmagában a terjedelem több mint felét magyarázza. Vagyis a redukció két
különálló lépésből áll: **szerkezetváltás** és **tartalomátrendezés**. Egyik sem
igényli, hogy információ elveszjen.

## A javasolt felállás

| Szakasz | Most | Javasolt |
|---|---|---|
| 4.1 bevezető szöveg | ~2 300 karakter | marad |
| Funkcionális követelmények | 5 egyoszlopos táblázat, 55 600 karakter | **1 többoszlopos táblázat, ~13 000 karakter** (26 sor) |
| Nem funkcionális követelmények | 4 oszlopos táblázat, 4 000 karakter | marad, apró tömörítéssel |
| Melléklet | nincs | **2 új melléklettáblázat**, ~15 000 karakter |

Becsült oldalszám: törzsanyagban **6–7 oldal**, mellékletben 5–6 oldal.

## 1. lépés: szerkezetváltás — egy többoszlopos táblázat

Az öt külön táblázat helyett **egyetlen táblázat**, amelyben a mostani
csoportcímek (1. Felhasználó- és jogosultságkezelés, stb.) átmenő
csoportfejléc-sorként szerepelnek. Így öt táblázatcím és öt képaláírás helyett
egy marad, és a csoportosítás mégis látszik.

Oszlopok — szándékosan ugyanaz a felépítés, mint a már működő 9. táblázatnál:

| Azonosító | Követelmény megnevezése | Szereplő | A követelmény tartalma | Igény |
|---|---|---|---|---|

- **Azonosító**: változatlan F-x.y. Ellenőriztem: a dolgozat egyetlen másik
  pontja sem hivatkozik ezekre az azonosítókra, tehát szabadon átszámozhatók —
  de nem javaslom, mert a mostani számozás logikus.
- **Szereplő**: a mostani „– Szereplő: HR-bér" kiemelve a címből saját oszlopba.
- **A követelmény tartalma**: az üzleti szabály és a rendszerviselkedés
  **összevont, 2–4 mondatos** megfogalmazása. Ez a tömörítés érdemi része.
- **Igény**: a 2.3 pont alpontjának száma, ahonnan a követelmény származik.
  Egy-egy hivatkozás kiváltja az üzleti szabály teljes újramondását.

## 2. lépés: tartalomátrendezés — mi marad, mi megy mellékletbe

A mostani öt szakasz mindegyike más sorsot kap:

| Szakasz | Mennyiség | Hová kerül | Miért |
|---|---|---|---|
| **Bemenő adatok** | 3 400 karakter | **törölhető** | A bemenő adatok a 6. fejezet sémájából és a követelmény szövegéből egyértelműen következnek. Jelenleg a 6.5 attribútumtáblázatait mondja újra magyar megnevezéssel |
| **Üzleti szabály** | 16 300 karakter | **1 mondatra tömörítve a törzsanyagba**, a 2.3.x pont megjelölésével | Ez a szakasz a 2.3 pont szó szerinti újramondása. A 4. fejezet feladata a követelmény nyilvántartása, nem az üzleti szabály újbóli levezetése |
| **Rendszerviselkedés** | 19 300 karakter | **2–3 mondatra tömörítve a törzsanyagba** | A részletes viselkedésleírás a 8. fejezetben (megvalósítás) és a 7. fejezetben (felület) amúgy is szerepel, méghozzá folyó szövegben, ami olvashatóbb. Háromszor leírva nem ad több információt |
| **Validációs korlát** | 8 100 karakter | **1. melléklet** | Követelményszintű, megőrzendő információ, de olvasás közben senki nem ezt keresi. Mellékletben teljes terjedelemben megmarad |
| **Ellenőrzés** | 6 900 karakter | **2. melléklet, követelmény–teszt megfeleltetés táblázata** | Jelenleg teszteset-nevek sorolódnak fel mondat közben. Mátrixként ugyanez az információ fele helyen van, és szakdolgozatban erősebb: egy pillantással látszik, hogy minden követelményhez tartozik teszt |

Összesen **15 000 karakter kerül mellékletbe és 39 000 karakter tömörödik**, de
mind a két melléklet visszakereshető az azonosító alapján, tehát egyetlen állítás
sem veszik el.

## A törzsanyagi táblázat — kidolgozott példák

Az alábbi három sor a mostani szövegből készült, hogy látható legyen az arány.
Az eredeti 901, 2 264 és 2 970 karakter, az új 430, 520 és 520 karakter.

| Azonosító | Követelmény megnevezése | Szereplő | A követelmény tartalma | Igény |
|---|---|---|---|---|
| F-1.1 | Szerepkör-alapú hozzáférés-vezérlés | Rendszer | A rendszer négy szerepkört különböztet meg, és a magasabb szintű szerepkör örökli az alacsonyabb funkcióit, ezért nincs felületi szerepkörváltás. A hozzáférést nem a szerepkör neve, hanem a szerepkörhöz rendelt, szerkeszthető jogosultsági mátrix dönti el, amelyet a rendszer minden kérésnél a kiszolgálón ellenőriz. | 2.3.4.1 |
| F-2.1 | Munkaidő-elszámolási kategóriák számítása | Rendszer | A rendszer három időkategóriát tart külön nyilván: a ténylegesen ledolgozott munkaidőt, a távolléti jogcímmel fedezett időt és a kettő összegeként előálló elszámolt óraszámot, mert a bérszámfejtés ezeket eltérő jogcímen számolja el. A számítás percalapú, minden percre pontosan egy pótlékkulcs jut, és egyetlen számított érték sem kerül tárolásra, hanem lekérdezéskor áll elő. | 2.3.1.4 |
| F-3.1 | Távolléti kérelem leadása és elbírálása | Dolgozó | A dolgozó a saját nevében ad le kérelmet, amelyet a közvetlen felettese vagy az általa delegált vezető bírál el jóváhagyással vagy indoklással ellátott elutasítással. A kérelem állapota Függőben, Folyamatban, Jóváhagyva, Elutasítva vagy Visszavonva; óraszámot csak a jóváhagyott kérelem fedez le, a függőben lévő nem. | 2.3.2.2 |

A tömörítés szabálya, amit végig érdemes tartani:

1. a cella **mit** és **miért** mond, nem **hogyan** — a hogyan a 7. és 8.
   fejezet dolga;
2. a jogszabályi hivatkozás (Mt. szakaszszám) bent marad, mert az a követelmény
   indoka;
3. a felületi elemek neve, a végpontok, a jelvények és a hibaüzenetek szövege
   kimarad;
4. ami számszerű korlát (három nap, tizenkét óra, 30%), az bent marad, mert az
   maga a követelmény.

## 1. melléklet — validációs korlátok

| Azonosító | A rendszer mit nem engedélyez |
|---|---|

Soronként egy követelmény, a mostani „Validációs korlát" szakasz szövege
változatlanul. 26 sor, körülbelül 8 000 karakter, 3 oldal.

Példa F-2.1-re: „A számítás percalapú, és minden percre pontosan egy
pótlékkulcsot ír jóvá. Jóváhagyott, teljes napot fedő távolléti jogcím esetén az
elszámolt idő a szerződéses napi óraszám, függőben lévő kérelem esetén nulla.
Beosztás hiányában a rendszer a tényleges munkaidőt tekinti beosztásnak, a napot
megjelöli, és nem feltételez túlórát."

## 2. melléklet — követelmény és teszteset megfeleltetése

| Azonosító | Egységteszt | Végponti teszt | Adatbázis-ellenőrzés |
|---|---|---|---|
| F-2.1 | pótlékszámítás 18 eset | havi nezet sajat honap, havi nezet jovahagyott jogcimmel, havi nezet fuggoben levo jogcimmel, havi nezet kotetlen dolgozora | – |

A teszteset-neveket a mostani „Ellenőrzés" szakaszokból lehet kigyűjteni. Ez a
melléklet egyben a 8. fejezet tesztelési pontjának hivatkozási alapja is lesz,
tehát ott sem kell újra felsorolni a teszteseteket.

## Opcionális: követelmények összevonása

Ha a 6–7 oldal még mindig sok, négy helyen van tartalmi átfedés. Mivel a
dolgozatban semmi nem hivatkozik az azonosítókra, az összevonás kockázat nélkül
elvégezhető, és 26 helyett 22 sor lesz.

| Összevonandó | Új azonosító | Miért |
|---|---|---|
| F-2.2 + F-2.11 (egyéni rögzítés, nap törlése) | F-2.2 | A törlés ugyanannak a műveletnek a része, nem önálló követelmény |
| F-2.1 + F-2.6 (kategóriák, éjfélen átnyúló műszak) | F-2.1 | Az éjfél kezelése a számítás egy esete, és a 8.4 pont részletesen leírja |
| F-3.1 + F-3.2 (kérelem, sürgős és lejárt jelölés) | F-3.1 | A jelölés a kérelemkezelés megjelenítési része |
| F-1.2 + F-1.5 (dolgozói nyilvántartás, fiókzárolás) | **nem javaslom** | A fiókzárolás biztonsági követelmény, önálló azonosítóval erősebb |

Ezzel szemben **nem javaslom** a törzsadatkezelés (F-1.4, a leghosszabb, 2 926
karakter) kivágását: ehelyett az egyes törzsadattípusok felsorolása kerüljön a
mellékletbe, a követelmény szövege pedig csak annyit mondjon, hogy a törzsadat
felületről karbantartható, bérkóddal és sorrenddel együtt.

## Amit érdemes megnézni a redukció előtt

A szabályzat szerint a mellékletek jellemzően nem számítanak bele az
oldalszámkeretbe, de ezt a szakdolgozati útmutatóban érdemes visszaellenőrizni,
mert ettől függ, mennyit lehet mellékletbe tenni és mennyit kell valóban
tömöríteni.
