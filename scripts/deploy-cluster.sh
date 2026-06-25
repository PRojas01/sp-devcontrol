#!/usr/bin/env bash
# =============================================================================
# deploy-cluster.sh — Deploy de devcontrol-linux-x64 a todos los nodos
# Uso: bash scripts/deploy-cluster.sh
# =============================================================================
# Nota: se usa -uo pipefail (sin -e) para capturar fallos por nodo sin abortar
set -uo pipefail

# ---------------------------------------------------------------------------
# Colores
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
# Directorio raíz del proyecto
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "?")"

log_step "SP-DevControl v${VERSION} — Deploy al cluster"

# ---------------------------------------------------------------------------
# Nodos del cluster
# ---------------------------------------------------------------------------
NODES=(
  "worker@192.168.18.101"
  "worker@192.168.18.102"
  "worker@192.168.18.103"
  "worker@192.168.18.104"
  "worker@192.168.18.105"
  "worker@192.168.18.106"
)

BINARY="${PROJECT_DIR}/release/devcontrol-linux-x64"
REMOTE_DIR="~/bin"
REMOTE_BIN="${REMOTE_DIR}/devcontrol"

# ---------------------------------------------------------------------------
# Verificar binario fuente
# ---------------------------------------------------------------------------
log_step "Verificando binario fuente"
if [[ ! -f "${BINARY}" ]]; then
  log_error "Binario no encontrado: ${BINARY}"
  log_error "Ejecuta primero: bash scripts/build-binaries.sh"
  exit 1
fi

BINARY_SIZE="$(du -h "${BINARY}" | cut -f1)"
log_ok "Binario listo: ${BINARY} (${BINARY_SIZE})"

# ---------------------------------------------------------------------------
# Opciones SSH comunes (timeout razonable, sin strict host check en cluster interno)
# ---------------------------------------------------------------------------
SSH_OPTS=(
  -o ConnectTimeout=10
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
)

# ---------------------------------------------------------------------------
# Función de deploy por nodo (se lanza en background)
# ---------------------------------------------------------------------------
deploy_node() {
  local NODE="$1"
  local IP="${NODE##*@}"   # extrae la IP para los mensajes

  # 1. Asegurar que ~/bin existe en el nodo remoto
  if ! ssh "${SSH_OPTS[@]}" "${NODE}" "mkdir -p ${REMOTE_DIR}" 2>/dev/null; then
    echo "FAIL:${IP}:No se pudo crear ${REMOTE_DIR}"
    return 1
  fi

  # 2. Copiar binario
  if ! scp "${SSH_OPTS[@]}" "${BINARY}" "${NODE}:${REMOTE_BIN}" 2>/dev/null; then
    echo "FAIL:${IP}:scp falló"
    return 1
  fi

  # 3. Permisos + verificación de versión + PATH
  local REMOTE_OUT
  if ! REMOTE_OUT="$(ssh "${SSH_OPTS[@]}" "${NODE}" bash <<'ENDSSH' 2>&1
set -e
chmod +x ~/bin/devcontrol

# Verificar que ~/bin está en PATH; si no, añadirlo a ~/.bashrc
if ! echo "$PATH" | grep -q "$HOME/bin"; then
  if ! grep -q 'export PATH="$HOME/bin:$PATH"' ~/.bashrc 2>/dev/null; then
    echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
    echo "PATH_ADDED"
  fi
fi

# Ejecutar con PATH garantizado
export PATH="$HOME/bin:$PATH"
~/bin/devcontrol --version
ENDSSH
  )"; then
    echo "FAIL:${IP}:chmod/version check falló"
    return 1
  fi

  local VER_LINE
  VER_LINE="$(echo "${REMOTE_OUT}" | grep -v '^PATH_ADDED$' | head -1)"

  local PATH_MSG=""
  if echo "${REMOTE_OUT}" | grep -q "^PATH_ADDED$"; then
    PATH_MSG=" [PATH actualizado en ~/.bashrc]"
  fi

  echo "OK:${IP}:${VER_LINE}${PATH_MSG}"
}

# ---------------------------------------------------------------------------
# Lanzar deploy en paralelo
# ---------------------------------------------------------------------------
log_step "Desplegando en ${#NODES[@]} nodos en paralelo ..."

declare -A PIDS
declare -A TMPFILES

for NODE in "${NODES[@]}"; do
  IP="${NODE##*@}"
  TMPFILE="/tmp/deploy-${IP}-$$.out"
  TMPFILES[$IP]="${TMPFILE}"

  (deploy_node "${NODE}" > "${TMPFILE}" 2>&1) &
  PIDS[$IP]=$!
  log_info "Lanzado deploy → ${NODE} (PID ${PIDS[$IP]})"
done

# ---------------------------------------------------------------------------
# Esperar todos los backgrounds y recoger resultados
# ---------------------------------------------------------------------------
log_step "Esperando resultados ..."

SUCCESS=0
FAIL=0
FAIL_NODES=()

for IP in "${!PIDS[@]}"; do
  PID="${PIDS[$IP]}"
  TMPFILE="${TMPFILES[$IP]}"

  wait "${PID}" || true   # no abortamos con -e; capturamos el estado manualmente
  RESULT="$(cat "${TMPFILE}" 2>/dev/null || true)"
  rm -f "${TMPFILE}"

  STATUS="${RESULT%%:*}"
  DETAIL="${RESULT#*:*:}"

  if [[ "${STATUS}" == "OK" ]]; then
    log_ok "${IP}  →  ${DETAIL}"
    SUCCESS=$((SUCCESS + 1))
  else
    log_error "${IP}  →  ${DETAIL}"
    FAIL=$((FAIL + 1))
    FAIL_NODES+=("${IP}")
  fi
done

# ---------------------------------------------------------------------------
# Resumen final
# ---------------------------------------------------------------------------
TOTAL="${#NODES[@]}"
echo
echo "${BOLD}${CYN}════════════════════════════════════════════${RST}"
echo "${BOLD}${CYN}  Resumen de deploy${RST}"
echo "${BOLD}${CYN}════════════════════════════════════════════${RST}"
echo "  Total nodos  : ${TOTAL}"
echo "  Actualizados : ${BOLD}${GRN}${SUCCESS}${RST}"
echo "  Fallidos     : ${BOLD}${RED}${FAIL}${RST}"

if [[ ${FAIL} -gt 0 ]]; then
  echo
  log_warn "Nodos con fallo:"
  for N in "${FAIL_NODES[@]}"; do
    echo "    ${RED}✗${RST} ${N}"
  done
  echo
  exit 1
fi

echo
log_ok "${SUCCESS}/${TOTAL} nodos actualizados correctamente."
