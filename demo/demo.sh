#!/usr/bin/env bash
set -euo pipefail

MODULE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$MODULE_DIR/dist/cli.js"
TMP_ROOT="${TMPDIR:-/tmp}"
WORKDIR="$(mktemp -d "$TMP_ROOT/devcontrol-demo.XXXXXX")"
WATCH_LOG="$(mktemp "$TMP_ROOT/devcontrol-demo-watch.XXXXXX")"
WATCH_PID=""

cleanup() {
  if [[ -n "$WATCH_PID" ]] && kill -0 "$WATCH_PID" 2>/dev/null; then
    kill "$WATCH_PID" 2>/dev/null || true
    wait "$WATCH_PID" 2>/dev/null || true
  fi
  rm -f "$WATCH_LOG"
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

if [[ ! -f "$CLI" ]]; then
  echo "dist/cli.js no existe. Ejecuta: cd DevControl-v2 && npm install && npm run build"
  exit 1
fi

export DEVCONTROL_HUMAN_APPROVAL_TOKEN="demo-human-token"

echo "== SP-DevControl: cambio observado, compuerta humana y auditoria =="
echo "Repo temporal: $WORKDIR"

cd "$WORKDIR"
git init -q
git config user.email "demo@example.invalid"
git config user.name "DevControl Demo"
mkdir -p src
printf '{"type":"module","scripts":{"test":"node --check src/feature.js"}}\n' > package.json

echo
echo "$ devcontrol init --project-name demo-governed-repo"
node "$CLI" init --project-name demo-governed-repo

node --input-type=module -e "
import fs from 'node:fs';
const path = '.devcontrol/config.json';
const cfg = JSON.parse(fs.readFileSync(path, 'utf8'));
cfg.rules.autoCommit = false;
cfg.scope.allowed = ['src/'];
cfg.stack = ['node'];
cfg.testing.testCommand = 'npm test';
fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
"

for doc in \
  docs/00-project-brief.md \
  docs/01-requirements.md \
  docs/02-architecture.md \
  docs/06-security-rules.md \
  docs/07-agent-rules.md
do
  printf '# Demo governance document\n\nEste documento temporal describe un repositorio de demostracion gobernado por SP-DevControl. El objetivo es permitir una sesion real con alcance src/, cambios observados por watcher, aprobacion humana no interactiva y auditoria local.\n\nLa arquitectura de la demo mantiene todo en un directorio temporal, limita el alcance a src/, activa una ruta protegida y conserva los eventos en .devcontrol para que el usuario pueda auditar que el cambio no queda aprobado sin visto bueno humano.\n' > "$doc"
done

echo
echo "$ devcontrol inject"
node "$CLI" inject

echo
echo "$ devcontrol gate:status"
node "$CLI" gate:status

echo
echo "$ devcontrol policy:protected:add --pattern src/feature.js"
node "$CLI" policy:protected:add --pattern "src/feature.js"

echo
echo "$ devcontrol session:start --objective \"Agregar feature controlada\" --scope src/"
SESSION_OUTPUT="$(node "$CLI" session:start --objective "Agregar feature controlada" --agent codex --scope src/)"
echo "$SESSION_OUTPUT"
SESSION_ID="$(printf '%s\n' "$SESSION_OUTPUT" | sed -n 's/^Session started: //p' | tail -n 1)"

echo
echo "$ devcontrol watch:start --session $SESSION_ID"
node "$CLI" watch:start --session "$SESSION_ID" >"$WATCH_LOG" 2>&1 &
WATCH_PID="$!"
sleep 2

echo
echo "$ printf ... > src/feature.js"
printf 'export function feature() {\n  return "controlled";\n}\n' > src/feature.js
sleep 4
kill "$WATCH_PID" 2>/dev/null || true
wait "$WATCH_PID" 2>/dev/null || true
WATCH_PID=""
sed -n '1,80p' "$WATCH_LOG"

echo
echo "$ devcontrol session:changes:list --session $SESSION_ID"
node "$CLI" session:changes:list --session "$SESSION_ID"
CHANGE_ID="$(node "$CLI" session:changes:list --session "$SESSION_ID" | node --input-type=module -e "let s=''; for await (const c of process.stdin) s+=c; const rows=JSON.parse(s); console.log(rows[0]?.id ?? '');")"

echo
echo "$ devcontrol session:change:approve --yes --human-token wrong-token"
if node "$CLI" session:change:approve --change-id "$CHANGE_ID" --yes --human-token wrong-token 2>&1; then
  echo "ERROR: la aprobacion con token invalido no debio pasar"
  exit 1
else
  echo "Resultado: bloqueado por token humano invalido."
fi

echo
echo "$ devcontrol session:change:approve --yes --human-token <token-valido>"
node "$CLI" session:change:approve --change-id "$CHANGE_ID" --yes --human-token "demo-human-token" --message "demo: visto bueno humano"

echo
echo "$ devcontrol session:changes:list --session $SESSION_ID"
node "$CLI" session:changes:list --session "$SESSION_ID"

echo
echo "$ tail -n 3 .devcontrol/sessions/*/${SESSION_ID}-audit.jsonl"
tail -n 3 .devcontrol/sessions/*/"$SESSION_ID"-audit.jsonl

echo
echo "$ devcontrol session:close --session $SESSION_ID"
node "$CLI" session:close --session "$SESSION_ID"
