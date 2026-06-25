#!/usr/bin/env bash
set -euo pipefail

# SP-DevControl v2 — script de publicación a npm
# Uso: bash scripts/publish.sh

PACKAGE_VERSION=$(node -p "require('./package.json').version")
PACKAGE_NAME=$(node -p "require('./package.json').name")

echo "==> Publicando ${PACKAGE_NAME}@${PACKAGE_VERSION}"
echo ""

# 1. Verificar que estamos en master y working tree limpio
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "master" && "$CURRENT_BRANCH" != "main" ]]; then
  echo "ERROR: Debes estar en la rama master/main. Rama actual: $CURRENT_BRANCH"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: Working tree no está limpio. Commitea o stashea los cambios primero."
  git status --short
  exit 1
fi

echo "[1/7] Rama: $CURRENT_BRANCH — working tree limpio. OK"

# 2. Build
echo "[2/7] Ejecutando npm run build..."
npm run build

# 3. Tests
echo "[3/7] Ejecutando npm test..."
npm test

# 4. Dry-run: mostrar qué se va a publicar
echo ""
echo "[4/7] Contenido que se publicará (npm pack --dry-run):"
npm pack --dry-run
echo ""

# 5. Pedir confirmación
read -r -p "¿Publicar ${PACKAGE_NAME}@${PACKAGE_VERSION} en npm? [s/N] " CONFIRM
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" && "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Publicación cancelada."
  exit 0
fi

# 6. Publicar en npm
echo "[5/7] Publicando en npm..."
npm publish

# 7. Crear git tag
TAG="v${PACKAGE_VERSION}"
echo "[6/7] Creando git tag ${TAG}..."
git tag "$TAG"
echo "Tag ${TAG} creado localmente."

# 8. Push de tags (pedir confirmación)
echo ""
read -r -p "¿Hacer push del tag ${TAG} al remoto? [s/N] " CONFIRM_PUSH
if [[ "$CONFIRM_PUSH" == "s" || "$CONFIRM_PUSH" == "S" || "$CONFIRM_PUSH" == "y" || "$CONFIRM_PUSH" == "Y" ]]; then
  echo "[7/7] Haciendo push del tag..."
  git push --tags
  echo "Tag ${TAG} publicado en el remoto."
else
  echo "[7/7] Push de tags omitido. Puedes hacerlo manualmente con: git push --tags"
fi

echo ""
echo "Publicación completada: ${PACKAGE_NAME}@${PACKAGE_VERSION}"
echo "Instalar con: npm install -g ${PACKAGE_NAME}"
