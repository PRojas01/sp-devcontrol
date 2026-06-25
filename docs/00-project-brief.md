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
v2.0.0 publicado: 37 comandos CLI, 36 controles de compliance, sesiones gobernadas, Git hooks de enforcement, preflight quality gates, reportes normativos (OWASP/RGPD/ISO 27001/CWE/SLSA), daemon + REST API + MCP server, soporte cross-platform Linux/Windows. 76 tests automatizados. CI/CD con GitHub Actions.

## Stack v2.0
Node.js ≥ 18 + TypeScript ESM strict + Commander + Chokidar + simple-git + JSON portable + Express + @modelcontextprotocol/sdk.

## Roadmap v2.1
Desktop: Tauri + Rust + React + SQLite como storage primario.
\n---\n_SP-DevControl v2.0.0 — Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador) — MIT License_
