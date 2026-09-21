# -*- coding: utf-8 -*-
"""
Fejlesztési ciklus ábra — egy funkció útja egy sprinten belül
==============================================================

Körkörös ábra, amely azt mutatja, hogy egy funkció öt lépésen megy végig,
és a ciklus funkciónként ismétlődik.

HASZNÁLAT
    cd docs/diagram
    python3 generate_ciklus.py

ELŐFELTÉTEL
    pip3 install matplotlib
"""

import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Wedge, FancyArrowPatch, Circle
from matplotlib.path import Path
import matplotlib.patches as mpatches

ITT = os.path.dirname(os.path.abspath(__file__))

# A ciklus lépései, az óramutató járásával megegyező irányban.
LEPESEK = [
    ("ADATBÁZIS",    "#2E5C8A", "#DCE9F7", "táblák, megszorítások\nés törzsadat"),
    ("BACKEND",      "#3B7A3B", "#DDEEDD", "végpontok, üzleti\nlogika, jogosultság"),
    ("FRONTEND",     "#B5721F", "#FBE6D4", "felület, űrlapok,\nállapotkezelés"),
    ("TESZT",        "#8A3B3B", "#F6DDDD", "Bruno-végponttesztek,\nstátuszkódok"),
    ("DOKUMENTÁCIÓ", "#6B4A7D", "#EFE4F5", "alfejezet és ábra,\nmíg friss"),
]

BELSO = 0.52          # a gyűrű belső sugara
KULSO = 0.92          # a gyűrű külső sugara
RES = 2.6             # fokban, a szeletek közti rés

fig, ax = plt.subplots(figsize=(10.5, 9.2))
ax.set_xlim(-1.95, 1.95)
ax.set_ylim(-1.55, 1.55)
ax.set_aspect("equal")
ax.axis("off")

n = len(LEPESEK)
szelet = 360 / n
# A kör tetejétől indulunk, és az óramutató járásával haladunk.
kezdo = 90

for i, (nev, szin, halvany, leiras) in enumerate(LEPESEK):
    v2 = kezdo - i * szelet - RES / 2
    v1 = kezdo - (i + 1) * szelet + RES / 2

    ax.add_patch(Wedge((0, 0), KULSO, v1, v2, width=KULSO - BELSO,
                       facecolor=szin, edgecolor="white", linewidth=2.5))

    # a szelet közepének szöge
    kozep = np.radians((v1 + v2) / 2)

    # a lépés neve a gyűrűn belül
    r_nev = (BELSO + KULSO) / 2
    ax.text(r_nev * np.cos(kozep), r_nev * np.sin(kozep), str(i + 1),
            ha="center", va="center", color="white", fontsize=23,
            fontweight="bold")

    # a lépés neve és magyarázata a gyűrűn kívül, hogy semmi ne lógjon ki
    r_txt = KULSO + 0.17
    x, y = r_txt * np.cos(kozep), r_txt * np.sin(kozep)
    ha = "center"
    if x > 0.25:
        ha = "left"
    elif x < -0.25:
        ha = "right"
    ax.text(x, y + 0.085, nev, ha=ha, va="center", fontsize=11.5,
            fontweight="bold", color=szin)
    ax.text(x, y - 0.095, leiras, ha=ha, va="center", fontsize=9.5,
            color="#444444", linespacing=1.45)

# ---------------------------------------------------------------- középpont
ax.add_patch(Circle((0, 0), BELSO - 0.045, facecolor="#F7F7F7",
                    edgecolor="#CCCCCC", linewidth=1.4))
ax.text(0, 0.11, "EGY FUNKCIÓ", ha="center", va="center",
        fontsize=14, fontweight="bold", color="#333333")
ax.text(0, -0.09, "egy sprint alatt", ha="center", va="center",
        fontsize=10.5, color="#666666")
ax.text(0, -0.27, "a kész definíciója szerint", ha="center", va="center",
        fontsize=8.5, color="#999999", style="italic")

# ---------------------------------------------------------------- körív nyíl
ív = 0.06
szog = np.linspace(np.radians(126), np.radians(64), 60)
r_n = KULSO + ív
ax.plot(r_n * np.cos(szog), r_n * np.sin(szog), color="#555555", linewidth=2.2)
# nyílhegy a végén
vx, vy = r_n * np.cos(szog[-1]), r_n * np.sin(szog[-1])
ex, ey = r_n * np.cos(szog[-6]), r_n * np.sin(szog[-6])
ax.add_patch(FancyArrowPatch((ex, ey), (vx, vy), arrowstyle="-|>",
                             mutation_scale=22, color="#555555", linewidth=0))
ax.text(0, KULSO + 0.30, "a ciklus funkciónként ismétlődik",
        ha="center", va="bottom", fontsize=10, color="#555555", style="italic")

# ---------------------------------------------------------------- alapozás
ax.text(0, -1.34,
        "Alapozás (egyszer, minden funkció előtt):  repó és verziókövetés  ·  "
        "szerver és adatbázis-kapcsolat  ·  hitelesítés  ·  frontend váza",
        ha="center", va="center", fontsize=8.5, color="#777777",
        bbox=dict(boxstyle="round,pad=0.55", facecolor="#FAFAFA",
                  edgecolor="#DDDDDD", linewidth=1))

plt.tight_layout()
for kit in ("png", "svg"):
    ut = os.path.join(ITT, f"modszertan-fejlesztesi-ciklus.{kit}")
    fig.savefig(ut, dpi=200 if kit == "png" else None,
                bbox_inches="tight", facecolor="white")
    print("MENTVE:", ut)
