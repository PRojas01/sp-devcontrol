---
name: govern-changes
description: Gobernar cambios de código con DevControl: sesiones, aprobaciones, políticas de riesgo y compliance. Usar cuando el usuario pida revisar, aprobar o rechazar cambios, verificar políticas, o generar reportes de cumplimiento en un proyecto con DevControl inicializado.
---

# Gobernar cambios con DevControl

Usar las herramientas del MCP `devcontrol` para mantener un ciclo de desarrollo trazable y aprobado.

## Flujo estándar

1. Verificar el estado del proyecto con `devcontrol_status`.
2. Si no hay sesión activa, iniciar una con `devcontrol_session_start` indicando el objetivo.
3. Antes de cada cambio significativo, evaluar el riesgo con `devcontrol_policy_check` (path o command).
4. Registrar cada cambio pendiente en la sesión activa.
5. Aprobar o rechazar cambios con `devcontrol_approve_change` / `devcontrol_reject_change` según la revisión.
6. Generar reporte de cumplimiento con `devcontrol_compliance_report` al finalizar.

## Reglas

- Siempre pasar `projectRoot` explícitamente para evitar ambigüedad entre proyectos.
- Una sesión activa a la vez por proyecto.
- No aprobar cambios en paths protegidos sin justificación explícita.
- El reporte de compliance incluye sesiones, cambios, controles y riesgos acumulados.

## Referencia de herramientas MCP

| Tool | Descripción |
|------|-------------|
| `devcontrol_status` | Estado: preflight, sesión activa, cambios pendientes |
| `devcontrol_session_start` | Iniciar nueva sesión de gobernanza |
| `devcontrol_approve_change` | Aprobar un cambio pendiente por ID |
| `devcontrol_reject_change` | Rechazar un cambio pendiente por ID |
| `devcontrol_policy_check` | Evaluar riesgo de path o command contra políticas |
| `devcontrol_compliance_report` | Generar reporte completo de cumplimiento |
