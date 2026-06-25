#!/usr/bin/env bash
# =============================================================================
# build-binaries.sh — Build paralelo de binarios SP-DevControl v2
# Targets: linux-x64, linux-arm64, win-x64
# Uso: bash scripts/build-binaries.sh
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Colores con tput (degradan limpiamente si no hay terminal)
# ---------------------------------------------------------------------------
BOLD="$(tput bold    2>/dev/null || true)"
RED="$(tput setaf 1  2>/dev/null || true)"
GRN="$(tput setaf 2  2>/dev/null || true)"
YLW="$(tput setaf 3  2>/dev/null || true)"
CYN="$(tput setaf 6  2>/dev/null || true)"
RST="$(tput sgr0     2>/dev/null || true)"

log_info()  { echo "${BOLD}${CYN}[INFO]${RST}  $*"; }
log_ok()    { echo "${BOLD}${GRN}[ OK ]${RST}  $*"; }
log_warn()  { echo "${BOLD}${YLW}[WARN]${RST}  $*"; }
log_error() { echo "${BOLD}${RED}[ERR ]${RST}  $*" >&2; }
log_step()  { echo; echo "${BOLD}${YLW}▶ $*${RST}"; }

# ---------------------------------------------------------------------------
# Directorio raíz del proyecto (padre de scripts/)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")"
BUILD_DATE="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

log_step "SP-DevControl v${VERSION} — Build de binarios"
log_info "Proyecto : ${PROJECT_DIR}"
log_info "Fecha    : ${BUILD_DATE}"

# ---------------------------------------------------------------------------
# 1. Verificar que dist/ existe (npm run build debe haberse ejecutado antes)
# ---------------------------------------------------------------------------
log_step "Verificando build TypeScript (dist/)"
if [[ ! -d "${PROJECT_DIR}/dist" ]] || [[ ! -f "${PROJECT_DIR}/dist/cli.js" ]]; then
  log_warn "dist/cli.js no encontrado — ejecutando npm run build ..."
  npm run build
  if [[ ! -f "${PROJECT_DIR}/dist/cli.js" ]]; then
    log_error "npm run build falló. Abortando."
    exit 1
  fi
fi
log_ok "dist/cli.js listo"

# ---------------------------------------------------------------------------
# 1b. Bundle ESM → CJS con esbuild (@yao-pkg/pkg no soporta ESM nativo)
# ---------------------------------------------------------------------------
log_step "Bundle ESM → CJS con esbuild"
mkdir -p "${PROJECT_DIR}/bundle"
npx esbuild "${PROJECT_DIR}/dist/cli.js" \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile="${PROJECT_DIR}/bundle/cli-full.cjs" \
  --define:import.meta.url='"file:///snapshot/cli.cjs"' \
  --log-level=warning
log_ok "Bundle: $(du -h "${PROJECT_DIR}/bundle/cli-full.cjs" | cut -f1)"
log_ok "dist/cli.js presente"

# ---------------------------------------------------------------------------
# 2. Preparar directorio release/
# ---------------------------------------------------------------------------
log_step "Preparando directorio release/"
mkdir -p "${PROJECT_DIR}/release"
log_ok "release/ listo"

# ---------------------------------------------------------------------------
# 3. Verificar que @yao-pkg/pkg está disponible
# ---------------------------------------------------------------------------
PKG_BIN="${PROJECT_DIR}/node_modules/.bin/pkg"
if [[ ! -x "${PKG_BIN}" ]]; then
  log_error "@yao-pkg/pkg no encontrado en node_modules/.bin/pkg"
  log_error "Ejecuta: npm install"
  exit 1
fi
log_ok "pkg encontrado: ${PKG_BIN}"

# ---------------------------------------------------------------------------
# 4. Definición de targets
# ---------------------------------------------------------------------------
declare -A TARGETS=(
  ["linux-x64"]="node18-linux-x64|release/devcontrol-linux-x64"
  ["linux-arm64"]="node18-linux-arm64|release/devcontrol-linux-arm64"
  ["win-x64"]="node18-win-x64|release/devcontrol-win-x64.exe"
)

# ---------------------------------------------------------------------------
# 5. Build paralelo
# ---------------------------------------------------------------------------
log_step "Compilando binarios en paralelo ..."

declare -A PIDS
declare -A LOGFILES

for PLATFORM in "${!TARGETS[@]}"; do
  IFS='|' read -r TARGET OUTPUT <<< "${TARGETS[$PLATFORM]}"
  LOGFILE="/tmp/pkg-${PLATFORM}-$$.log"
  LOGFILES[$PLATFORM]="${LOGFILE}"

  log_info "Lanzando build → ${PLATFORM} (${OUTPUT})"
  (
    "${PKG_BIN}" bundle/cli-full.cjs \
      --target "${TARGET}" \
      --output "${OUTPUT}" \
      > "${LOGFILE}" 2>&1
  ) &
  PIDS[$PLATFORM]=$!
done

# ---------------------------------------------------------------------------
# 6. Esperar y reportar resultado de cada build
# ---------------------------------------------------------------------------
log_step "Esperando finalización de builds ..."
FAIL=0

for PLATFORM in "${!PIDS[@]}"; do
  PID="${PIDS[$PLATFORM]}"
  LOGFILE="${LOGFILES[$PLATFORM]}"
  IFS='|' read -r TARGET OUTPUT <<< "${TARGETS[$PLATFORM]}"

  if wait "${PID}"; then
    log_ok "Build completado: ${PLATFORM}"
  else
    log_error "Build FALLIDO: ${PLATFORM}"
    echo "--- log ${PLATFORM} ---"
    cat "${LOGFILE}" || true
    echo "--- fin log ---"
    FAIL=$((FAIL + 1))
  fi
  rm -f "${LOGFILE}"
done

if [[ $FAIL -gt 0 ]]; then
  log_error "${FAIL} build(s) fallaron. Abortando."
  exit 1
fi

# ---------------------------------------------------------------------------
# 7. Mostrar tamaños de binarios
# ---------------------------------------------------------------------------
log_step "Tamaños de binarios generados"
for PLATFORM in "${!TARGETS[@]}"; do
  IFS='|' read -r TARGET OUTPUT <<< "${TARGETS[$PLATFORM]}"
  if [[ -f "${PROJECT_DIR}/${OUTPUT}" ]]; then
    SIZE="$(du -h "${PROJECT_DIR}/${OUTPUT}" | cut -f1)"
    log_ok "${OUTPUT}  →  ${BOLD}${SIZE}${RST}"
  else
    log_error "Binario no encontrado: ${OUTPUT}"
    FAIL=$((FAIL + 1))
  fi
done

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi

# ---------------------------------------------------------------------------
# 8. Calcular SHA256 y guardar checksums
# ---------------------------------------------------------------------------
log_step "Calculando SHA256 checksums ..."
CHECKSUM_FILE="${PROJECT_DIR}/release/checksums.sha256"

# Encabezado del archivo de checksums
{
  echo "# SP-DevControl v${VERSION} — SHA256 Checksums"
  echo "# Generated: ${BUILD_DATE}"
  echo ""
} > "${CHECKSUM_FILE}"

for PLATFORM in "${!TARGETS[@]}"; do
  IFS='|' read -r TARGET OUTPUT <<< "${TARGETS[$PLATFORM]}"
  BINARY="${PROJECT_DIR}/${OUTPUT}"
  if [[ -f "${BINARY}" ]]; then
    HASH="$(sha256sum "${BINARY}" | awk '{print $1}')"
    BASENAME="$(basename "${BINARY}")"
    echo "${HASH}  ${BASENAME}" >> "${CHECKSUM_FILE}"
    log_ok "${BASENAME}: ${CYN}${HASH}${RST}"
  fi
done

log_ok "Checksums guardados en release/checksums.sha256"

# ---------------------------------------------------------------------------
# 9. Generar release/RELEASE_NOTES.md
# ---------------------------------------------------------------------------
log_step "Generando release/RELEASE_NOTES.md ..."
NOTES_FILE="${PROJECT_DIR}/release/RELEASE_NOTES.md"

{
  echo "# SP-DevControl v${VERSION} — Release Notes"
  echo ""
  echo "**Fecha de build:** ${BUILD_DATE}"
  echo ""
  echo "## Plataformas"
  echo ""
  echo "| Plataforma   | Binario                       |"
  echo "|--------------|-------------------------------|"

  for PLATFORM in "${!TARGETS[@]}"; do
    IFS='|' read -r TARGET OUTPUT <<< "${TARGETS[$PLATFORM]}"
    BASENAME="$(basename "${OUTPUT}")"
    echo "| ${PLATFORM}  | \`${BASENAME}\`  |"
  done

  echo ""
  echo "## Checksums SHA256"
  echo ""
  echo '```'
  cat "${CHECKSUM_FILE}"
  echo '```'
  echo ""
  echo "## Instalación rápida (Linux x64)"
  echo ""
  echo '```bash'
  echo "cp release/devcontrol-linux-x64 /usr/local/bin/devcontrol"
  echo "chmod +x /usr/local/bin/devcontrol"
  echo "devcontrol --version"
  echo '```'
  echo ""
  echo "---"
  echo "_Build generado automáticamente por \`scripts/build-binaries.sh\`_"
} > "${NOTES_FILE}"

log_ok "RELEASE_NOTES.md generado"

# ---------------------------------------------------------------------------
# Resumen final
# ---------------------------------------------------------------------------
echo
echo "${BOLD}${GRN}════════════════════════════════════════════${RST}"
echo "${BOLD}${GRN}  Build completado — SP-DevControl v${VERSION}${RST}"
echo "${BOLD}${GRN}════════════════════════════════════════════${RST}"
echo
ls -lh "${PROJECT_DIR}/release/"
