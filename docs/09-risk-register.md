# Risk Register

## Riesgos activos

| ID    | Descripción                                              | Probabilidad | Impacto | Estado  |
|-------|----------------------------------------------------------|--------------|---------|---------|
| R-010 | MCP server expuesto en localhost accesible por otras apps| Media        | Medio   | Abierto |
| R-011 | better-sqlite3 nativo puede fallar en binarios pkg       | Media        | Alto    | Abierto |
| R-012 | Daemon no se reinicia automáticamente tras crash         | Alta         | Alto    | Abierto |

---

### R-010 — MCP server expuesto en localhost

**Descripción:** El servidor MCP HTTP/SSE escucha en `localhost:7893`. Otras aplicaciones locales con acceso a la red loopback pueden realizar peticiones no autorizadas a los tools MCP, lo que podría permitir lecturas de sesiones o ejecución de comandos en el contexto del proyecto.

**Mitigación:** Bind explícito a `127.0.0.1` únicamente (no `0.0.0.0`). Verificar en `mcp.ts` que el `listen` usa `'127.0.0.1'` como segundo argumento. No exponer el puerto en reglas de firewall.

---

### R-011 — better-sqlite3 nativo en binarios pkg

**Descripción:** `better-sqlite3` incluye un addon nativo (`.node`). Al empaquetar con `pkg`, el archivo `.node` debe estar declarado explícitamente en `pkg.assets` del `package.json`. Si no se incluye, el binario standalone fallará en runtime con un error de módulo nativo no encontrado.

**Mitigación:** Añadir `"assets": ["node_modules/better-sqlite3/build/Release/*.node"]` a la config `pkg` en `package.json`. Verificar en CI que el binario arranca y ejecuta una operación de DB básica tras el build.

---

### R-012 — Daemon sin reinicio automático tras crash

**Descripción:** Si el proceso daemon muere inesperadamente (OOM, excepción no capturada), las sesiones activas se pierden y los editores no pueden comunicarse con la API ni el MCP server hasta que el usuario reinicie el daemon manualmente.

**Mitigación:** Instalar un systemd user unit con `Restart=on-failure` y `RestartSec=3s`. Ver `docs/10-deployment.md` para la unidad de ejemplo. En Windows, usar el Task Scheduler con la opción de reinicio en fallo.
\n---\n_SP-DevControl v2.0.0 — Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador) — MIT License_
