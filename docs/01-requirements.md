# Requisitos — SP-DevControl

## Requisitos funcionales

| ID | Requisito | Estado |
|---|---|---|
| RF-01 | Inicializar proyecto con estructura de gobernanza (config, docs, policy, hooks) | Completado |
| RF-02 | Detectar fase del proyecto (uninitialized, initialized, designed, development, testing, release) | Completado |
| RF-03 | Bloquear inicio de sesión si documentación de diseño está incompleta (preflight) | Completado |
| RF-04 | Gestionar sesiones gobernadas con objetivo, checklist, aprobaciones y cierre formal | Completado |
| RF-05 | Monitorear cambios en archivos en tiempo real con clasificación de riesgo (LOW, MEDIUM, HIGH) | Completado |
| RF-06 | Aprobar o rechazar cambios detectados con rollback automático | Completado |
| RF-07 | Instalar Git hooks (pre-commit, pre-push, commit-msg) que bloqueen commits/pushes no conformes | Completado |
| RF-08 | Generar reglas para editores agénticos (CLAUDE.md, .cursorrules, copilot-instructions.md, .windsurfrules) | Completado |
| RF-09 | Generar reportes de compliance con mapeo controles-normas y evidencia de violaciones | Completado |
| RF-10 | Motor de políticas: rutas protegidas, comandos aprobados/bloqueados, patrones de riesgo | Completado |
| RF-11 | Snapshots manuales y automáticos con rollback por cambio y por sesión | Completado |
| RF-12 | Catálogo de 36 controles en 8 categorías con validadores y reglas de inyección | Completado |

## Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-01 | Offline-first | Funcionar sin conexión a internet |
| RNF-02 | Cross-platform | Compatible con Linux y Windows (Node.js ≥ 20) |
| RNF-03 | Inicio rápido | CLI responde en menos de 500ms para comandos sin I/O |
| RNF-04 | No invasivo | No modifica el código del proyecto; solo genera archivos en .devcontrol/ y reglas de editor |
| RNF-05 | Extensible | Nuevos controles se agregan al catálogo sin modificar el motor |
| RNF-06 | Portable | Almacenamiento JSON con escritura atómica; sin dependencias de sistema |
| RNF-07 | Seguro | No transmite datos; detección de secrets y PII en memoria/contexto |

## Atributos de calidad
- **Trazabilidad**: cada cambio, aprobación y sesión queda auditada.
- **Resiliencia**: recuperación automática ante corrupción de base de datos JSON.
- **Consistencia**: conventional commits validados via hook.
- **Cumplimiento**: controles mapeados a OWASP Top 10, RGPD, ISO 27001, CWE, SLSA.
\n---\n_SP-DevControl v2.0.0 — Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador) — MIT License_
