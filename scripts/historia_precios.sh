#!/usr/bin/env bash
# Agrega los pinnacle-*.json de esta corrida a la rama «historia-precios» (no pisa nada; reintenta si otro escáner subió a la vez).
# Uso (en un workflow, desde la raíz del repo): bash scripts/historia_precios.sh pinnacle-datos.json [más archivos]
set -u
REPO="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
for intento in 1 2 3 4; do
  rm -rf /tmp/historia && mkdir -p /tmp/historia && cd /tmp/historia
  git init -q -b historia-precios
  git config user.name "escaner-ova"; git config user.email "escaner-ova@users.noreply.github.com"
  git fetch -q "$REPO" historia-precios 2>/dev/null && git reset -q --hard FETCH_HEAD
  cd "$GITHUB_WORKSPACE"
  for f in "$@"; do [ -f "$f" ] && node scripts/historia_precios.js /tmp/historia "$f"; done
  cd /tmp/historia
  git add -A
  if git diff --cached --quiet; then echo "Historia: nada nuevo"; exit 0; fi
  git commit -q -m "historia de precios"
  if git push -q "$REPO" HEAD:historia-precios; then echo "Historia de precios guardada"; exit 0; fi
  echo "Otro escáner subió a la vez; reintento ($intento)"; sleep $((intento * 5))
done
echo "No pude guardar la historia de precios"; exit 1
