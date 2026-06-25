# SP-DevControl - Resumen de Arquitectura

## Arquitectura objetivo
- CLI de control
- daemon local
- desktop app
- adaptadores de integracion

## Capas
- Presentacion
- Aplicacion
- Dominio
- Infraestructura

## Componentes principales
- project-initializer
- policy-engine
- editor-launcher
- file-monitor
- command-guard
- git-controller
- snapshot-manager
- approval-engine
- audit-logger
- context-builder

## Principios
- control antes del primer prompt
- sesion gobernada
- auditoria por defecto
- rollback disponible
- contexto minimo suficiente

## Riesgos arquitectonicos abiertos
- integraciones heterogeneas con editores
- bloqueo real vs deteccion posterior
- frontera entre prototipo Node y producto Rust/Tauri
