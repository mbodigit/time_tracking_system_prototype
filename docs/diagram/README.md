# ER-diagramok

Az ábrák a `backend/migrations` mappában lévő SQL-szkriptekből generálódnak,
ezért soha nem térhetnek el a tényleges adatbázistól. Ha a séma változik, elég
újra lefuttatni a generátort.

## Telepítés (egyszer)

A Graphviz a rajzoló motor. macOS-en Homebrew-val:

```bash
brew install graphviz
```

Ellenőrzés:

```bash
dot -V          # pl. dot - graphviz version 12.2.1
fdp -V
```

Ha nincs Homebrew, előbb az kell:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## VS Code beállítás

Két bővítmény hasznos, de egyik sem kötelező a generáláshoz:

| Bővítmény | Azonosító | Mire jó |
|---|---|---|
| Graphviz Interactive Preview | `tintinweb.graphviz-interactive-preview` | `.dot` fájl élő előnézete |
| Graphviz (dot) language support | `joaompinto.vscode-graphviz` | szintaxiskiemelés |

Előnézet megnyitása: a `.dot` fájlon **jobb gomb → Preview Graphviz / Dot**,
vagy `Cmd+Shift+P` → *Graphviz Interactive: Preview*.

## Generálás

```bash
cd docs/diagram
python3 generate_er.py
```

Hat `.dot`, hat `.png` és hat `.svg` fájl készül:

| Fájl | Mit mutat |
|---|---|
| `er-1-jogosultsag` | szerepkörök, jogosultságok és a köztük lévő mátrix |
| `er-2-munkaido-parameterek` | munkarendek, óraszámok, törzsidők, jogcímek, pótlékok |
| `er-3-szervezet` | terület, részleg, műszak, csoport |
| `er-4-dolgozok` | dolgozói törzsadat és a felhasználói fiókok |
| `er-5-mukodes` | munkaidő-nyilvántartás és távolléti kérelmek |
| `er-6-onallo-torzsadat` | a többi törzsadattábla |

A `.png` a dolgozatba illeszthető, a `.svg` méretezhető, a `.dot` pedig a
szerkeszthető forrás.

## Jelölés

Chen-jelölés: **téglalap** az egyed, **ellipszis** az attribútum, **rombusz** a
kapcsolat. Az elsődleges kulcs aláhúzva. A vonalakon lévő `1` és `N` a
számosságot jelöli.

Minden részdiagramnak van egy fókusza, ahol az egyedek minden attribútumukkal
szerepelnek. A hozzájuk kapcsolódó, de máshol kifejtett egyedek csak az
elsődleges kulcsukkal jelennek meg, hogy az ábra olvasható maradjon.

Az idegen kulcs oszlopai szándékosan nem szerepelnek ellipszisként: azokat a
kapcsolat rombusza fejezi ki. Ez a Chen-jelölés szokásos eljárása.

A háttérszín a felépítés négy lépését követi: kék a törzsadat, zöld a szervezet,
narancs az emberek, piros a működés.

## Ha módosítani akarsz

**Tartalom** (melyik tábla melyik ábrára kerüljön, hogyan hívják a
kapcsolatokat): a `generate_er.py` fájlban a `RESZDIAGRAMOK` és a
`KAPCSOLAT_NEV` listákban. Utána újra kell futtatni a szkriptet.

**Elrendezés** (mi hol helyezkedjen el): közvetlenül a `.dot` fájlban. Ilyenkor
viszont a szkript újrafuttatása felülírja a kézi változtatásokat, ezért érdemes
a kézzel igazított változatot más néven elmenteni.

A rajzolást az `fdp` motor végzi, amely sugarasan rendezi el a csomópontokat —
így kerülnek az attribútumok az egyed köré, ahogy a Chen-ábráknál szokás. Ha
mégis soros elrendezést szeretnél, a szkript végén az `fdp` helyére írj `dot`-ot.
