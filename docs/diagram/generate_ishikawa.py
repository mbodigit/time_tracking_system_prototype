# -*- coding: utf-8 -*-
"""
Ishikawa-diagram — miért nem tartható fenn az Excel alapú nyilvántartás
=======================================================================

A 2.2 pont hiányosságait rendezi ok-okozati szerkezetbe. A halfej a következmény,
a gerincre csatlakozó bordák a kiváltó okok csoportjai.

HASZNÁLAT
    cd docs/diagram
    python3 generate_ishikawa.py

ELŐFELTÉTEL
    pip3 install matplotlib
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Polygon

ITT = os.path.dirname(os.path.abspath(__file__))

KOVETKEZMENY = ("Az Excel alapú\nmunkaidő-nyilvántartás\nnem tartható fenn")

# (kategória, [okok])  — a sorrend adja az elhelyezést: 0,2,4 felül, 1,3,5 alul
KATEGORIAK = [
    ("MÓDSZER", [
        "Kézi havi összesítés,\n150 főre 2 fő × 1–1,5 hét",
        "A4-re nyomtatott összesítő,\npapír alapú aláírás",
        "Az adatok kézi újrafelvitele\na bérszámfejtő programba",
        "Távolléti kérelem e-mailben,\nelkeveredhet",
    ]),
    ("ADATVÉDELEM", [
        "A fájlon belül mindenki\nlátja a többiek adatát",
        "Könnyen kitalálható jelszavak",
        "Több területen ugyanaz\na jelszó",
        "Nincs szerepkör alapú\nhozzáférés",
    ]),
    ("ESZKÖZ", [
        "Fájlzárolás: egyszerre\negy szerkesztő",
        "Hálózati meghajtón tárolás",
        "Nincs verziókövetés",
        "Sablonhiba esetén minden\ntáblázat újragyártása",
    ]),
    ("HIÁNYZÓ KÉPESSÉG", [
        "Fél órás időlépték",
        "Nem adható meg törzsidő",
        "Munkaközi szünet nem\nrögzíthető",
        "Nincs automatikus\npótlékszámítás",
    ]),
    ("ADAT", [
        "Redundáns fájlok",
        "A dolgozó törölheti a fájlt,\nadatvesztés",
        "Másolási hibából\nsérült fájl",
        "Nincs egységes adatforrás,\n20+ párhuzamos táblázat",
    ]),
    ("SKÁLÁZHATÓSÁG", [
        "Minden be- és kilépéskor\núj táblázat keletkezik",
        "20+ táblázat párhuzamos\nkarbantartása",
        "A ráfordítás a létszámmal\negyenesen nő",
        "Új terület = új táblázat\na sablonból",
    ]),
]

SOTET = "#1F3A4D"
LILA = "#6B4A7D"
SZURKE = "#444444"

fig, ax = plt.subplots(figsize=(17.5, 8.2))
ax.set_xlim(0, 100)
ax.set_ylim(9, 51)
ax.axis("off")

GERINC_Y = 30
GERINC_X0, GERINC_X1 = 6, 76

# ------------------------------------------------------------------ gerinc
ax.plot([GERINC_X0, GERINC_X1], [GERINC_Y, GERINC_Y],
        color=SOTET, linewidth=3, solid_capstyle="round")

# a hal farka
ax.add_patch(Polygon([[GERINC_X0, GERINC_Y], [1.5, GERINC_Y + 6],
                      [1.5, GERINC_Y - 6]],
                     closed=True, facecolor=SOTET, edgecolor="none"))

# ------------------------------------------------------------------ halfej
ax.add_patch(Polygon([[GERINC_X1, GERINC_Y], [83, GERINC_Y + 9],
                      [97, GERINC_Y], [83, GERINC_Y - 9]],
                     closed=True, facecolor=SOTET, edgecolor="none"))
ax.text(86, GERINC_Y, KOVETKEZMENY, ha="center", va="center",
        color="white", fontsize=11.5, fontweight="bold", linespacing=1.5)

# ------------------------------------------------------------------ bordák
# Három borda felül, három alul, egyenletesen elosztva a gerincen.
BORDA_X = [20, 38, 56]
BORDA_HOSSZ_X = 7      # a ferde szakasz vízszintes vetülete
BORDA_HOSSZ_Y = 14     # a ferde szakasz függőleges vetülete

for index, (nev, okok) in enumerate(KATEGORIAK):
    felul = (index % 2 == 0)
    x_talp = BORDA_X[index // 2]
    irany = 1 if felul else -1
    szin = SOTET if felul else LILA

    x_teto = x_talp + BORDA_HOSSZ_X
    y_teto = GERINC_Y + irany * BORDA_HOSSZ_Y

    ax.plot([x_talp, x_teto], [GERINC_Y, y_teto],
            color=szin, linewidth=2.2, solid_capstyle="round")

    # a kategória neve a borda végén
    ax.text(x_teto + 0.6, y_teto + irany * 1.6, nev,
            ha="left", va="center" if felul else "center",
            fontsize=11, fontweight="bold", color=szin)

    # az okok felsorolása a borda mellett
    for i, ok in enumerate(okok):
        y = y_teto - irany * (i * 3.4 + 1.2)
        ax.plot([x_teto + 0.4, x_teto + 1.4], [y, y],
                color=szin, linewidth=1.2)
        ax.text(x_teto + 1.9, y, ok, ha="left", va="center",
                fontsize=8.8, color=SZURKE, linespacing=1.35)

# ------------------------------------------------------------------ mentés
plt.tight_layout()
for kiterjesztes in ("png", "svg"):
    ut = os.path.join(ITT, f"ishikawa-excel-hianyossagok.{kiterjesztes}")
    fig.savefig(ut, dpi=200 if kiterjesztes == "png" else None,
                bbox_inches="tight", facecolor="white")
    print("MENTVE:", ut)

print(f"\n{len(KATEGORIAK)} kategória, "
      f"{sum(len(o) for _, o in KATEGORIAK)} ok")
