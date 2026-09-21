# -*- coding: utf-8 -*-
"""
Fejlesztési módszertan ábra — függőleges szeletelés
====================================================

Azt mutatja be, hogy egy sprint nem egy réteget, hanem egy teljes funkciót
készít el, az adatbázistól a dokumentációig.

HASZNÁLAT
    cd docs/diagram
    python3 generate_modszertan.py

ELŐFELTÉTEL
    brew install graphviz
"""

import os
import subprocess
import html

ITT = os.path.dirname(os.path.abspath(__file__))

# A rétegek, fentről lefelé, ahogy a szelet átvágja őket.
RETEGEK = [
    ("ADATBÁZIS",    "#DCE9F7", "#2E5C8A"),
    ("BACKEND",      "#DDEEDD", "#3B7A3B"),
    ("FRONTEND",     "#FBE6D4", "#A5661F"),
    ("TESZT",        "#F6DDDD", "#8A3B3B"),
    ("DOKUMENTÁCIÓ", "#EFE4F5", "#6B4A7D"),
]

# Az elkészült szelet tartalma rétegenként.
KESZ_SZELET = {
    "ADATBÁZIS":    "szerepkörök és a\njogosultsági mátrix\nfeltöltése",
    "BACKEND":      "authController\nauthMiddleware\npermissionService",
    "FRONTEND":     "login-page\nProtectedRoute\nmenüszűrés",
    "TESZT":        "Bruno: 200 / 401 / 403\nés a jelszócsere",
    "DOKUMENTÁCIÓ": "7.1 alfejezet\nszekvenciadiagram",
}

# A további szeletek, még nem készültek el.
TOVABBI = ["Törzsadatok", "Dolgozók és\nfiókok", "Munkaidő\nrögzítése", "Kérelmek"]

KESZ_CIM = "Bejelentkezés és\njogosultságkezelés"


def cella(szoveg, hatter, keret, halvany=False):
    if halvany:
        return (f'<TD BGCOLOR="#FAFAFA" WIDTH="110" HEIGHT="62">'
                f'<FONT POINT-SIZE="9" COLOR="#BBBBBB">tervezett</FONT></TD>')
    sorok = "<BR/>".join(html.escape(s) for s in szoveg.split("\n"))
    return (f'<TD BGCOLOR="{hatter}" WIDTH="150" HEIGHT="62">'
            f'<FONT POINT-SIZE="9" COLOR="#333333">{sorok}</FONT></TD>')


sorok_html = []

# fejléc
fej = ('<TR><TD BGCOLOR="white" BORDER="0"></TD>'
       f'<TD BGCOLOR="#3B7A3B" WIDTH="150">'
       f'<FONT POINT-SIZE="10" COLOR="white"><B>'
       f'{KESZ_CIM.replace(chr(10), "<BR/>")}</B></FONT></TD>')
for t in TOVABBI:
    fej += (f'<TD BGCOLOR="#E8E8E8" WIDTH="110">'
            f'<FONT POINT-SIZE="10" COLOR="#777777">'
            f'{t.replace(chr(10), "<BR/>")}</FONT></TD>')
fej += "</TR>"
sorok_html.append(fej)

# rétegek
for nev, hatter, keret in RETEGEK:
    sor = (f'<TR><TD BGCOLOR="{keret}" WIDTH="120" ALIGN="RIGHT">'
           f'<FONT POINT-SIZE="9" COLOR="white"><B>{nev}</B></FONT></TD>')
    sor += cella(KESZ_SZELET[nev], hatter, keret)
    for _ in TOVABBI:
        sor += cella("", "", "", halvany=True)
    sor += "</TR>"
    sorok_html.append(sor)

tabla = ('<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5">'
         + "".join(sorok_html) + "</TABLE>>")

L = [
    "digraph Modszertan {",
    '  graph [rankdir=TB, bgcolor="white", pad=0.35, fontname="Helvetica"];',
    '  node [shape=plaintext, fontname="Helvetica"];',
    '  edge [fontname="Helvetica", fontsize=9];',
    "",
    f"  racs [label={tabla}];",
    "",
    # magyarázó doboz
    '  magyarazat [label=<'
    '<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="6" '
    'COLOR="#999999" BGCOLOR="#FFFFFF">'
    '<TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">'
    '<B>Egy sprint egy teljes funkciót készít el, nem egy réteget.</B>'
    '</FONT></TD></TR>'
    '<TR><TD ALIGN="LEFT"><FONT POINT-SIZE="9">'
    'A szelet átvágja mind az öt réteget, ezért a sprint végén a funkció '
    'használható.<BR ALIGN="LEFT"/>'
    'Ha elfogy az idő, kevesebb funkció készül el, de mindegyik teljes — '
    'nem marad<BR ALIGN="LEFT"/>'
    'félkész rendszer, amelyben van adatbázis, de nincs hozzá felület.'
    '</FONT></TD></TR>'
    '</TABLE>>];',
    "",
    "  racs -> magyarazat [style=invis];",
    "}",
]

dot = os.path.join(ITT, "modszertan-fuggoleges-szeleteles.dot")
png = os.path.join(ITT, "modszertan-fuggoleges-szeleteles.png")
with open(dot, "w", encoding="utf-8") as fh:
    fh.write("\n".join(L) + "\n")

subprocess.run(["dot", "-Tpng", "-Gdpi=150", dot, "-o", png], check=True)
subprocess.run(["dot", "-Tsvg", dot, "-o", png.replace(".png", ".svg")], check=True)
print("MENTVE:", png)
