#!/usr/bin/env bash
# =============================================================================
# install-deps-cluster.sh — Instala Node 20 en workers con Node < 20 vía nvm
# Uso: bash scripts/install-deps-cluster.sh
# =============================================================================
# Sin -e para capturar fallos por nodo sin abortar el script
set -uo pipefail

# ---------------------------------------------------------------------------
# Colores
# ---------------------------------------------------------------------------
BOLD="$(tput bold    2>/dev/null || true)"
RED="$(tput setaf 1  2>/dev/null || true)"
GRN="$(tput setaf 2  2>/dev/null || true)"
YLW="$(tput setaf 3  2>/dev/null || true)"
CYN="$(tput setaf 6  2>/dev/null || true)"
MAG="$(tput setaf 5  2>/dev/null || true)"
RST="$(tput sgr0     2>/dev/null || true)"

log_info()  { echo "${BOLD}${CYN}[INFO]${RST}  $*"; }
log_ok()    { echo "${BOLD}${GRN}[ OK ]${RST}  $*"; }
log_warn()  { echo "${BOLD}${YLW}[WARN]${RST}  $*"; }
log_error() { echo "${BOLD}${RED}[ERR ]${RST}  $*" >&2; }
log_step()  { echo; echo "${BOLD}${YLW}▶ $*${RST}"; }
log_skip()  { echo "${BOLD}${MAG}[SKIP]${RST}  $*"; }

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

NODE_TARGET="20"
NVM_INSTALL_URL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh"

# ---------------------------------------------------------------------------
# Opciones SSH
# ---------------------------------------------------------------------------
SSH_OPTS=(
  -o ConnectTimeout=15
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
)

log_step "SP-DevControl — Instalación de Node ${NODE_TARGET} en cluster"
log_info "Nodos objetivo: ${#NODES[@]}"

# ---------------------------------------------------------------------------
# Función de instalación por nodo (se ejecuta en background)
# ---------------------------------------------------------------------------
check_and_install_node() {
  local NODE="$1"
  local IP="${NODE##*@}"

  # -----------------------------------------------------------
  # Paso 1: Verificar versión actual de Node en el nodo remoto
  # -----------------------------------------------------------
  local CURRENT_VERSION
  CURRENT_VERSION="$(ssh "${SSH_OPTS[@]}" "${NODE}" bash <<'ENDSSH' 2>/dev/null
# Intentar encontrar node en las ubicaciones habituales
for CANDIDATE in \
    "$(command -v node 2>/dev/null)" \
    "$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node/ 2>/dev/null | sort -V | tail -1)/bin/node" \
    "/usr/local/bin/node" \
    "/usr/bin/node"; do
  if [[ -x "${CANDIDATE}" ]]; then
    "${CANDIDATE}" --version 2>/dev/null && break
  fi
done
ENDSSH
  )" || true

  # Normalizar: quitar la 'v' inicial
  local VERSION_CLEAN="${CURRENT_VERSION#v}"
  local MAJOR="${VERSION_CLEAN%%.*}"

  # -----------------------------------------------------------
  # Paso 2: Decidir si es necesario instalar
  # -----------------------------------------------------------
  if [[ -n "${MAJOR}" ]] && [[ "${MAJOR}" =~ ^[0-9]+$ ]] && [[ "${MAJOR}" -ge "${NODE_TARGET}" ]]; then
    echo "SKIP:${IP}:Node ${CURRENT_VERSION} >= ${NODE_TARGET} (sin acción)"
    return 0
  fi

  local REASON
  if [[ -z "${MAJOR}" ]]; then
    REASON="Node no encontrado"
  else
    REASON="Node ${CURRENT_VERSION} < ${NODE_TARGET}"
  fi

  # -----------------------------------------------------------
  # Paso 3: Instalar nvm + Node 20 en el nodo remoto
  # -----------------------------------------------------------
  local INSTALL_LOG
  if ! INSTALL_LOG="$(ssh "${SSH_OPTS[@]}" "${NODE}" bash <<ENDSSH 2>&1
set -e

# 1. Instalar curl si no existe (Debian/Ubuntu)
if ! command -v curl &>/dev/null; then
  sudo apt-get update -qq && sudo apt-get install -y -qq curl
fi

# 2. Instalar nvm si no está disponible
export NVM_DIR="\$HOME/.nvm"
if [[ ! -s "\${NVM_DIR}/nvm.sh" ]]; then
  curl -fsSL "${NVM_INSTALL_URL}" | bash
fi

# 3. Cargar nvm
export NVM_DIR="\$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "\${NVM_DIR}/nvm.sh" ] && . "\${NVM_DIR}/nvm.sh"

# 4. Instalar Node ${NODE_TARGET}
nvm install ${NODE_TARGET}
nvm alias default ${NODE_TARGET}
nvm use ${NODE_TARGET}

# 5. Asegurar que nvm se carga en shells no-interactivos (.bashrc)
if ! grep -q 'NVM_DIR' "\$HOME/.bashrc" 2>/dev/null; then
  cat >> "\$HOME/.bashrc" <<'NVMBLOCK'

# nvm — añadido por install-deps-cluster.sh
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
[ -s "\$NVM_DIR/bash_completion" ] && . "\$NVM_DIR/bash_completion"
NVMBLOCK
fi

# 6. Verificar resultado
node --version
npm --version
ENDSSH
  )"; then
    echo "FAIL:${IP}:${REASON} — instalación falló"
    return 1
  fi

  local NEW_VER
  NEW_VER="$(echo "${INSTALL_LOG}" | grep -E '^v[0-9]+\.' | tail -1 || true)"
  echo "INSTALLED:${IP}:${REASON} → Node ${NEW_VER} instalado correctamente"
}

# ---------------------------------------------------------------------------
# Lanzar en paralelo
# ---------------------------------------------------------------------------
log_step "Verificando e instalando Node en ${#NODES[@]} nodos (paralelo) ..."

declare -A PIDS
declare -A TMPFILES

for NODE in "${NODES[@]}"; do
  IP="${NODE##*@}"
  TMPFILE="/tmp/nodeinstall-${IP}-$$.out"
  TMPFILES[$IP]="${TMPFILE}"

  (check_and_install_node "${NODE}" > "${TMPFILE}" 2>&1) &
  PIDS[$IP]=$!
  log_info "Comprobando ${NODE} (PID ${PIDS[$IP]}) ..."
done

# ---------------------------------------------------------------------------
# Esperar resultados
# ---------------------------------------------------------------------------
log_step "Esperando finalización ..."

COUNT_OK=0
COUNT_SKIP=0
COUNT_FAIL=0
FAIL_NODES=()

for IP in "${!PIDS[@]}"; do
  wait "${PIDS[$IP]}" || true
  TMPFILE="${TMPFILES[$IP]}"
  RESULT="$(cat "${TMPFILE}" 2>/dev/null || true)"
  rm -f "${TMPFILE}"

  STATUS="${RESULT%%:*}"
  DETAIL="${RESULT#*:*:}"   # todo lo que sigue al segundo ':'

  case "${STATUS}" in
    OK|SKIP)
      log_skip "${IP}  →  ${DETAIL}"
      COUNT_SKIP=$((COUNT_SKIP + 1))
      ;;
    INSTALLED)
      log_ok "${IP}  →  ${DETAIL}"
      COUNT_OK=$((COUNT_OK + 1))
      ;;
    FAIL)
      log_error "${IP}  →  ${DETAIL}"
      COUNT_FAIL=$((COUNT_FAIL + 1))
      FAIL_NODES+=("${IP}")
      ;;
    *)
      log_warn "${IP}  →  Resultado inesperado: ${RESULT}"
      COUNT_FAIL=$((COUNT_FAIL + 1))
      FAIL_NODES+=("${IP}")
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Resumen final
# ---------------------------------------------------------------------------
TOTAL="${#NODES[@]}"
echo
echo "${BOLD}${CYN}════════════════════════════════════════════${RST}"
echo "${BOLD}${CYN}  Resumen — Node ${NODE_TARGET} en cluster${RST}"
echo "${BOLD}${CYN}════════════════════════════════════════════${RST}"
printf "  Total nodos    : %s\n"  "${TOTAL}"
printf "  Ya con Node 20+: ${BOLD}${MAG}%s${RST}\n" "${COUNT_SKIP}"
printf "  Instalados     : ${BOLD}${GRN}%s${RST}\n" "${COUNT_OK}"
printf "  Fallidos       : ${BOLD}${RED}%s${RST}\n" "${COUNT_FAIL}"

if [[ ${COUNT_FAIL} -gt 0 ]]; then
  echo
  log_warn "Nodos con fallo:"
  for N in "${FAIL_NODES[@]}"; do
    echo "    ${RED}✗${RST} ${N}"
  done
  echo
  exit 1
fi

echo
log_ok "Todos los nodos tienen Node >= ${NODE_TARGET}."
