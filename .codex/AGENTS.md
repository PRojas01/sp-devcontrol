# Agentes Codex — DevControl

## Reglas de gobernanza

1. Antes de cualquier cambio de código, verificar el estado con `devcontrol_status`.
2. Evaluar el riesgo de cada operación con `devcontrol_policy_check` antes de ejecutarla.
3. Mantener una sesión de gobernanza activa durante todo el ciclo de trabajo.
4. Aprobar cambios solo después de revisión manual explícita.
5. No modificar paths protegidos sin aprobación previa.

## Flujo de trabajo

```
devcontrol_status → devcontrol_session_start → [trabajo] → devcontrol_policy_check → devcontrol_approve_change → devcontrol_compliance_report
```
