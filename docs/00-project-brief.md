# Project Brief — SP-DevControl

## Nombre del producto
SP-DevControl — Capa local de gobernanza para desarrollo asistido por IA.

## Problema
Los editores de código agénticos (Claude Code, Cursor, Copilot, Windsurf) aceleran la ejecución pero carecen de gobernanza, trazabilidad, control de alcance, rollback y disciplina arquitectónica. Sin control local, los agentes pueden modificar archivos protegidos, introducir dependencias no aprobadas, saltar diseño e ignorar normativas de seguridad y privacidad.

## Objetivo
Proporcionar una herramienta CLI local que gobierne todo el ciclo de desarrollo asistido por IA: validar el proyecto antes del primer prompt, imponer diseño primero, monitorear cambios en tiempo real, clasificar riesgo, exigir aprobaciones, generar snapshots, auditar cada sesión y garantizar cumplimiento normativo (OWASP, RGPD, ISO 27001, CWE, SLSA).

## Usuarios objetivo
- Desarrolladores individuales que usan editores agénticos.
- Tech leads que necesitan supervisar el trabajo con IA.
- Consultorías y equipos que requieren evidencia de cumplimiento normativo.

## Propuesta de valor
1. **Diseño primero**: bloquea el desarrollo si la documentación de diseño está incompleta.
2. **Control paso a paso**: cada cambio detectado requiere aprobación según nivel de riesgo.
3. **Cumplimiento normativo**: 36 controles mapeados a normas internacionales.
4. **Inyección de reglas**: genera instrucciones nativas para cada editor agéntico.
5. **Auditoría completa**: trazabilidad de sesiones, cambios, aprobaciones y snapshots.

## Estado actual
MVP CLI completado con 33 comandos, 36 controles, sistema de sesiones gobernadas, Git hooks de enforcement, preflight quality gates, reportes de compliance y soporte cross-platform Linux/Windows.

## Stack actual
Node.js + TypeScript + Commander + Chokidar + simple-git + JSON portable.

## Stack objetivo (v2.0)
Tauri + Rust + React + TypeScript + SQLite.
