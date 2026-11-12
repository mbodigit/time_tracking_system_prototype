#!/bin/sh
set -e

KONYVTAR=$(dirname "$0")
KORNYEZET="$KONYVTAR/environments/Local.yml"

if [ ! -f "$KORNYEZET" ]; then
  echo "Nem talalom a kornyezetfajlt: $KORNYEZET"
  exit 1
fi

napokkal_korabban() {
  if date -v-1d +%Y-%m-%d >/dev/null 2>&1; then
    date -v-"$1"d +%Y-%m-%d
  else
    date -d "$1 days ago" +%Y-%m-%d
  fi
}

MA=$(date +%Y-%m-%d)
TEGNAP=$(napokkal_korabban 1)
CSOPORT_NAP=$(napokkal_korabban 2)
EV=$(date +%Y)
HONAP=$(date +%m | sed 's/^0//')

awk -v ma="$MA" -v tegnap="$TEGNAP" -v csoportNap="$CSOPORT_NAP" \
    -v ev="$EV" -v honap="$HONAP" '
  /^  - name: / { valtozo = $3 }
  /^    value: / && valtozo == "ma"         { print "    value: " ma;         next }
  /^    value: / && valtozo == "tegnap"     { print "    value: " tegnap;     next }
  /^    value: / && valtozo == "csoportNap" { print "    value: " csoportNap; next }
  /^    value: / && valtozo == "ev"         { print "    value: \"" ev "\"";  next }
  /^    value: / && valtozo == "honap"      { print "    value: \"" honap "\""; next }
  { print }
' "$KORNYEZET" > "$KORNYEZET.uj"

mv "$KORNYEZET.uj" "$KORNYEZET"

echo "A Bruno kornyezetfajl datumai frissitve:"
echo "  ma          = $MA"
echo "  tegnap      = $TEGNAP"
echo "  csoportNap  = $CSOPORT_NAP"
echo "  ev          = $EV"
echo "  honap       = $HONAP"
