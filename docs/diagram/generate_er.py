# -*- coding: utf-8 -*-
"""
ER-diagram generátor — munkaidő-nyilvántartó rendszer
======================================================

Ez a szkript a backend/migrations mappában lévő SQL-szkriptekből olvassa ki az
adatbázis szerkezetét, és ebből rajzolja meg az ER-diagramokat. Semmi nincs
kézzel beírva, ezért a diagram soha nem térhet el a tényleges adatbázistól.

HASZNÁLAT
---------
    cd docs/diagram
    python3 generate_er.py

A kimenet ugyanebbe a mappába kerül, .dot és .png formátumban. A .dot a
Graphviz forrásnyelve, ezt VS Code-ban közvetlenül is meg lehet nyitni és
szerkeszteni, a .png pedig beilleszthető a dolgozatba.

ELŐFELTÉTEL
-----------
    brew install graphviz

JELÖLÉS
-------
Chen-jelölés: téglalap az egyed, ellipszis az attribútum, rombusz a kapcsolat.
Az elsődleges kulcs aláhúzva. A vonalakon lévő 1 és N a kapcsolat számosságát
mutatja.

Mivel a teljes adatmodell 24 egyedből és 148 attribútumból áll, egyetlen
Chen-ábrán olvashatatlan lenne, ezért hat részdiagram készül. Minden
részdiagramnak van egy fókusza, ahol az egyedek minden attribútumukkal
szerepelnek, és vannak kapcsolódó egyedei, amelyek csak az elsődleges
kulcsukkal jelennek meg — azok a saját részdiagramjukon vannak kifejtve.
"""

import os
import re
import subprocess
import html

# ---------------------------------------------------------------- útvonalak
ITT = os.path.dirname(os.path.abspath(__file__))
MIGRACIOK = os.path.join(ITT, "..", "..", "backend", "migrations")
FAJLOK = ["001_torzsadatok.sql", "002_szervezet.sql",
          "003_emberek.sql", "004_mukodes.sql"]

TIPUSOK = (r"(?:INT|TINYINT|BOOLEAN|VARCHAR\(\d+\)|DATE|TIME|DATETIME"
           r"|DECIMAL\([\d,]+\)|TEXT|ENUM\([^)]*\))")


# ---------------------------------------------------------------- kiolvasás
def sema_beolvasas():
    """A CREATE TABLE és ALTER TABLE utasításokból felépíti a séma leírását."""
    tablak, sorrend = {}, []

    for fajlnev in FAJLOK:
        sql = open(os.path.join(MIGRACIOK, fajlnev), encoding="utf-8").read()

        for tnev, torzs in re.findall(
                r"CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\n\)\s*ENGINE", sql, re.S):
            t = {"fajl": fajlnev, "oszlopok": [], "pk": [], "fk": []}

            # A kommenteket előbb szedjük ki, mert ha vessző van bennük,
            # az elrontaná a felbontást.
            tiszta = "\n".join(re.sub(r"--.*$", "", s) for s in torzs.split("\n"))

            melyseg, aktualis, reszek = 0, "", []
            for karakter in tiszta:
                if karakter == "(":
                    melyseg += 1
                elif karakter == ")":
                    melyseg -= 1
                if karakter == "," and melyseg == 0:
                    reszek.append(aktualis)
                    aktualis = ""
                else:
                    aktualis += karakter
            reszek.append(aktualis)

            for nyers in reszek:
                s = re.sub(r"\s+", " ", nyers).strip()
                if not s:
                    continue

                m = re.match(r"^PRIMARY KEY\s*\(([^)]*)\)", s, re.I)
                if m:
                    t["pk"] = [c.strip() for c in m.group(1).split(",")]
                    continue

                m = re.match(
                    r"^CONSTRAINT\s+(\w+)\s+FOREIGN KEY\s*\(([^)]*)\)\s*"
                    r"REFERENCES\s+(\w+)\s*\(([^)]*)\)", s, re.I | re.S)
                if m:
                    t["fk"].append({
                        "nev": m.group(1),
                        "oszlopok": [c.strip() for c in m.group(2).split(",")],
                        "hivatkozott": m.group(3),
                    })
                    continue

                m = re.match(rf"^([a-z_][a-z0-9_]*)\s+({TIPUSOK})(.*)$", s, re.I | re.S)
                if m:
                    t["oszlopok"].append({
                        "nev": m.group(1),
                        "tipus": m.group(2).upper(),
                        "kotelezo": "NOT NULL" in m.group(3).upper(),
                    })

            tablak[tnev] = t
            sorrend.append(tnev)

        # Az utólag, ALTER TABLE-lel hozzáadott idegen kulcsok. A csoport
        # vezetőjére mutató kapcsolat körkörössége miatt így kerül be.
        egysoros = re.sub(r"\s+", " ", sql)
        for tn, cn, oszl, ht in re.findall(
                r"ALTER TABLE (\w+) ADD CONSTRAINT (\w+) FOREIGN KEY "
                r"\(([^)]*)\) REFERENCES (\w+) ?\(", egysoros):
            if tn in tablak and not any(f["nev"] == cn for f in tablak[tn]["fk"]):
                tablak[tn]["fk"].append({
                    "nev": cn,
                    "oszlopok": [c.strip() for c in oszl.split(",")],
                    "hivatkozott": ht,
                })

    return tablak, sorrend


# ---------------------------------------------------------------- beállítások
# A kapcsolatok nevei. Ezek jelennek meg a rombuszokban.
#
# A nevet úgy kell megválasztani, hogy az ábra mondatként olvasható legyen a
# gyermek egyedtől a szülő felé:
#
#     Departments -N- BelongsTo -1- Areas
#     "Több részleg tartozik egy területhez." (Departments BelongsTo Areas)
#
KAPCSOLAT_NEV = {
    "fk_permission_parent":         "BelongsTo",
    "fk_department_area":           "BelongsTo",
    "fk_shift_department":          "BelongsTo",
    "fk_group_area":                "LocatedIn",
    "fk_group_department_in_area":  "LocatedIn",
    "fk_group_shift_in_department": "LocatedIn",
    "fk_group_cost_center":         "ChargedTo",
    "fk_group_work_schedule":       "Follows",
    "fk_group_working_hour":        "Requires",
    "fk_group_core_hour":           "Requires",
    "fk_group_manager":             "ManagedBy",
    "fk_employee_work_schedule":    "Follows",
    "fk_employee_working_hour":     "Requires",
    "fk_employee_core_hour":        "Requires",
    "fk_employee_cost_center":      "ChargedTo",
    "fk_employee_work_location":    "WorksAt",
    "fk_employee_category":         "ClassifiedAs",
    "fk_employee_status":           "HasStatus",
    "fk_employee_group":            "MemberOf",
    "fk_employee_manager":          "ReportsTo",
    "fk_user_employee":             "AccountOf",
    "fk_user_role":                 "HasRole",
    "fk_wtt_employee":              "RecordedFor",
    "fk_wtt_absence":               "CoveredBy",
    "fk_request_employee":          "RequestedBy",
    "fk_request_absence":           "AppliesFor",
    "fk_request_decision_by":       "DecidedBy",
}

# A tisztán kapcsoló táblák NEM egyedek, hanem kapcsolatok. A relációs
# adatbázisban táblaként kell megvalósítani őket, Chen-jelölésben viszont
# rombuszként kell rajzolni, a két összekötött egyed között, M:N számossággal.
#
# A felismerés szabálya: az elsődleges kulcsot pontosan a két idegen kulcs
# alkotja, és a táblának nincs más attribútuma.
KAPCSOLOTABLA_NEV = {
    "RolePermissions":        "Grants",
    "AbsenceWorkSchedules":   "AvailableIn",
    "WorkScheduleAllowances": "Entitles",
}

SZIN = {
    "001_torzsadatok.sql": ("#DCE9F7", "#2E5C8A"),
    "002_szervezet.sql":   ("#DDEEDD", "#3B7A3B"),
    "003_emberek.sql":     ("#FBE6D4", "#A5661F"),
    "004_mukodes.sql":     ("#F6DDDD", "#8A3B3B"),
}

# A hat részdiagram. A "fokusz" egyedei minden attribútummal megjelennek,
# a hozzájuk kapcsolódó többi egyed csak az elsődleges kulcsával.
#
# A negyedik érték a rajzoló motor:
#   fdp  — sugaras elrendezés. Ott jó, ahol egy egyednek sok attribútuma van,
#          mert az attribútumok az egyed köré rendeződnek.
#   dot  — soros, hierarchikus elrendezés. Ott jó, ahol sok a kapcsolat,
#          mert a vonalak kevésbé keresztezik egymást.
RESZDIAGRAMOK = [
    ("1-jogosultsag", "Jogosultságkezelés",
     ["UserRoles", "Permissions", "RolePermissions"], "dot"),

    ("2-munkaido-parameterek", "Munkaidő-paraméterek",
     ["WorkSchedules", "WorkingHours", "CoreHours", "Absences",
      "AbsenceWorkSchedules", "Allowances", "WorkScheduleAllowances"], "dot"),

    ("3-szervezet", "Szervezeti hierarchia és csoportok",
     ["Areas", "Departments", "Shifts", "UserGroups"], "dot"),

    ("4-dolgozok", "Dolgozók és felhasználói fiókok",
     ["Employees", "Users"], "dot"),

    ("5-mukodes", "Munkaidő-nyilvántartás és kérelmek",
     ["WorkingTimeTracking", "Requests"], "dot"),

    ("6-onallo-torzsadat", "Önálló törzsadattáblák",
     ["EmployeeStatus", "EmployeeCategories", "CostCenters",
      "WorkLocations", "GlobalCalendar", "CompanySettings"], "dot"),
]


# ---------------------------------------------------------------- rajzolás
def kapcsolotabla_e(t):
    """Igaz, ha a tábla tisztán kapcsoló tábla: az elsődleges kulcsot pontosan
       a két idegen kulcs alkotja, és nincs más attribútuma."""
    if len(t["fk"]) != 2 or len(t["pk"]) != 2:
        return False
    fk_oszlopok = {c for f in t["fk"] for c in f["oszlopok"]}
    return fk_oszlopok == set(t["pk"]) and len(t["oszlopok"]) == 2


def diagram_keszites(tablak, azonosito, cim, fokusz, motor="fdp"):
    """Egy Chen-jelölésű részdiagram elkészítése."""

    # A kapcsolótáblák rombuszként jelennek meg, nem egyedként. Ezért a
    # fókuszból kivesszük őket, a két végpontjukat viszont felvesszük.
    kapcsolok = [n for n in fokusz if kapcsolotabla_e(tablak[n])]
    fokusz = [n for n in fokusz if n not in kapcsolok]
    for n in kapcsolok:
        for f in tablak[n]["fk"]:
            if f["hivatkozott"] not in fokusz:
                fokusz.append(f["hivatkozott"])

    # A fókuszból kiinduló és oda mutató kapcsolatok gyűjtése. A kapcsolódó
    # egyedek csak az elsődleges kulcsukkal jelennek meg.
    kapcsolodo = set()
    elek = []
    for tnev in tablak:
        if kapcsolotabla_e(tablak[tnev]):
            continue          # ezeket külön, rombuszként rajzoljuk
        for f in tablak[tnev]["fk"]:
            if tnev in fokusz or f["hivatkozott"] in fokusz:
                if tnev in fokusz and f["hivatkozott"] in fokusz:
                    elek.append((tnev, f))
                elif tnev in fokusz:
                    kapcsolodo.add(f["hivatkozott"])
                    elek.append((tnev, f))

    # A cím szándékosan NEM kerül az ábrába: a kép így egynyelvű marad, a
    # magyar felirat pedig a dolgozatban, ábraaláírásként jelenik meg.
    L = [
        "graph ER {",
        '  fontname="Helvetica";',
        ('  graph [overlap=prism, splines=true, sep="+10", esep="+4",'
         ' pack=true, packmode=array, bgcolor="white", pad=0.3];'
         if motor == "fdp" else
         '  graph [rankdir=LR, splines=spline, nodesep=0.3, ranksep=1.0,'
         ' pack=true, packmode=array, bgcolor="white", pad=0.3];'),
        '  node [fontname="Helvetica", fontsize=10];',
        '  edge [fontname="Helvetica", fontsize=9, color="#555555"];',
        "",
    ]

    def egyed_rajzolas(tnev, teljes):
        t = tablak[tnev]
        hatter, keret = SZIN[t["fajl"]]
        pk = set(t["pk"])
        fk = {c for f in t["fk"] for c in f["oszlopok"]}

        L.append(f'  "{tnev}" [shape=box, style="filled,bold", '
                 f'fillcolor="{hatter}", color="{keret}", penwidth=1.6];')

        for c in t["oszlopok"]:
            # Az idegen kulcs oszlopokat nem rajzoljuk ki: azokat a
            # kapcsolat rombusza fejezi ki.
            if c["nev"] in fk and c["nev"] not in pk:
                continue
            if not teljes and c["nev"] not in pk:
                continue

            if c["nev"] in pk:
                cimke = f'<<U>{html.escape(c["nev"])}</U>>'
            else:
                cimke = f'"{c["nev"]}"'

            aid = f"{tnev}__{c['nev']}"
            L.append(f'  "{aid}" [shape=ellipse, style=filled, fillcolor="white", '
                     f'color="#999999", fontsize=8, label={cimke}];')
            # A rövid rugóhossz az egyedéhez tapasztja az attribútumot, így nem
            # sodródik egy másik egyed közelébe.
            L.append(f'  "{tnev}" -- "{aid}" [len=0.8, weight=4];')

    L.append("  // fókuszban lévő egyedek, minden attribútummal")
    for tnev in fokusz:
        egyed_rajzolas(tnev, teljes=True)

    if kapcsolodo:
        L.append("")
        L.append("  // kapcsolódó egyedek, csak az elsődleges kulccsal")
        for tnev in sorted(kapcsolodo):
            egyed_rajzolas(tnev, teljes=False)

    L.append("")
    L.append("  // kapcsolatok")
    for tnev, f in elek:
        rid = f"R_{f['nev']}"
        nev = KAPCSOLAT_NEV.get(f["nev"], f["hivatkozott"].lower())
        L.append(f'  "{rid}" [shape=diamond, style=filled, fillcolor="white", '
                 f'color="#666666", fontsize=8, label="{nev}", '
                 f'width=1.0, height=0.55];')
        # A kapcsolatok hosszabb rugóval kerülnek távolabb, hogy az egyedek
        # és az attribútumfürtjeik ne érjenek egymásba.
        L.append(f'  "{tnev}" -- "{rid}" [label="N", len=2.4];')
        L.append(f'  "{rid}" -- "{f["hivatkozott"]}" [label="1", len=2.4];')

    if kapcsolok:
        L.append("")
        L.append("  // több-a-többhöz kapcsolatok (a relációs sémában kapcsolótábla)")
        for n in kapcsolok:
            a, b = tablak[n]["fk"][0]["hivatkozott"], tablak[n]["fk"][1]["hivatkozott"]
            nev = KAPCSOLOTABLA_NEV.get(n, n)
            rid = f"R_{n}"
            L.append(f'  "{rid}" [shape=diamond, style=filled, fillcolor="white", '
                     f'color="#666666", fontsize=9, label="{nev}", '
                     f'width=1.3, height=0.7];')
            L.append(f'  "{a}" -- "{rid}" [label="M", len=2.4];')
            L.append(f'  "{rid}" -- "{b}" [label="N", len=2.4];')

    L.append("}")

    dot_utvonal = os.path.join(ITT, f"er-{azonosito}.dot")
    png_utvonal = os.path.join(ITT, f"er-{azonosito}.png")
    with open(dot_utvonal, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    subprocess.run([motor, "-Tpng", "-Gdpi=150", dot_utvonal, "-o", png_utvonal],
                   check=True)
    subprocess.run([motor, "-Tsvg", dot_utvonal, "-o",
                    png_utvonal.replace(".png", ".svg")], check=True)
    return png_utvonal, len(fokusz), len(kapcsolodo), len(elek)


# ---------------------------------------------------------------- futtatás
if __name__ == "__main__":
    tablak, sorrend = sema_beolvasas()
    print(f"Beolvasva: {len(sorrend)} tábla, "
          f"{sum(len(t['oszlopok']) for t in tablak.values())} attribútum, "
          f"{sum(len(t['fk']) for t in tablak.values())} idegen kulcs\n")

    lefedett = set()
    for azonosito, cim, fokusz, motor in RESZDIAGRAMOK:
        hianyzo = [n for n in fokusz if n not in tablak]
        if hianyzo:
            raise SystemExit(f"HIBA: ismeretlen tábla a {azonosito} diagramban: {hianyzo}")
        png, nf, nk, ne = diagram_keszites(tablak, azonosito, cim, fokusz, motor)
        lefedett.update(fokusz)
        print(f"  {os.path.basename(png):34} {motor:4} fókusz={nf}  kapcsolódó={nk}  kapcsolat={ne}")

    kimaradt = set(tablak) - lefedett
    if kimaradt:
        print(f"\nFIGYELEM: egyetlen részdiagram fókuszában sem szerepel: {sorted(kimaradt)}")
    else:
        print(f"\nMind a {len(tablak)} tábla szerepel valamelyik részdiagram fókuszában.")
