/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import { VERSION } from './version.js'
import type { DevSentinelConfig } from './types.js'

export interface DocTemplate {
  id: string
  filename: string
  title: string
  description: string
  required: boolean
  generate: (config: DevSentinelConfig) => string
}

const DOCS_CATALOG: DocTemplate[] = [
  {
    id: 'master-document',
    filename: '00-master-document.md',
    title: 'Documento Maestro',
    description: 'Executive summary, vision, scope, and project governance overview',
    required: true,
    generate: generateMasterDocument,
  },
  {
    id: 'project-brief',
    filename: '01-project-brief.md',
    title: 'Project Brief',
    description: 'Project objectives, context, stakeholders, and success criteria',
    required: true,
    generate: generateProjectBrief,
  },
  {
    id: 'stack-definition',
    filename: '02-stack-definition.md',
    title: 'Stack Definition',
    description: 'Authorized technology stack, justification, and constraints',
    required: true,
    generate: generateStackDefinition,
  },
  {
    id: 'architecture',
    filename: '03-architecture.md',
    title: 'Architecture',
    description: 'System architecture, layers, components, and technical decisions',
    required: true,
    generate: generateArchitecture,
  },
  {
    id: 'data-model',
    filename: '04-data-model.md',
    title: 'Data Model',
    description: 'Database schema, entities, relationships, and data flow',
    required: true,
    generate: generateDataModel,
  },
  {
    id: 'ui-design',
    filename: '05-ui-design.md',
    title: 'UI/UX Design System',
    description: 'Visual design system, components, typography, colors, and layout rules',
    required: true,
    generate: generateUIDesign,
  },
  {
    id: 'api-contracts',
    filename: '06-api-contracts.md',
    title: 'API Contracts',
    description: 'API endpoints, request/response schemas, authentication, and versioning',
    required: false,
    generate: generateAPIContracts,
  },
  {
    id: 'security-rules',
    filename: '07-security-rules.md',
    title: 'Security Rules',
    description: 'Security policies, authentication, authorization, and compliance requirements',
    required: true,
    generate: generateSecurityRules,
  },
  {
    id: 'agent-rules',
    filename: '08-agent-rules.md',
    title: 'Agent Rules',
    description: 'AI agent governance rules, restrictions, and behavioral constraints',
    required: true,
    generate: generateAgentRules,
  },
  {
    id: 'change-log',
    filename: '09-change-log.md',
    title: 'Change Log',
    description: 'Versioned record of all significant changes',
    required: true,
    generate: generateChangeLog,
  },
  {
    id: 'risk-register',
    filename: '10-risk-register.md',
    title: 'Risk Register',
    description: 'Identified risks, severity, mitigation strategies, and status',
    required: true,
    generate: generateRiskRegister,
  },
  {
    id: 'legal-compliance',
    filename: '11-legal-compliance.md',
    title: 'Legal & Compliance',
    description: 'Legal framework, applicable regulations, GDPR/RGPD, terms of service, and compliance requirements',
    required: true,
    generate: generateLegalCompliance,
  },
  {
    id: 'licensing',
    filename: '12-licensing.md',
    title: 'Licensing',
    description: 'Software license, dependency licenses, intellectual property, and distribution rights',
    required: true,
    generate: generateLicensing,
  },
  {
    id: 'repository-management',
    filename: '13-repository-management.md',
    title: 'Repository Management',
    description: 'Git workflow, branching strategy, CI/CD, release process, and repository policies',
    required: true,
    generate: generateRepositoryManagement,
  },
  {
    id: 'user-data-management',
    filename: '14-user-data-management.md',
    title: 'User Data Management',
    description: 'Personal data handling, consent, storage, retention, deletion, and privacy policies',
    required: true,
    generate: generateUserDataManagement,
  },
  {
    id: 'database-management',
    filename: '15-database-management.md',
    title: 'Database Management',
    description: 'Database strategy, migrations, backups, recovery, performance, and data integrity policies',
    required: true,
    generate: generateDatabaseManagement,
  },
  {
    id: 'installation-uninstallation',
    filename: '16-installation-uninstallation.md',
    title: 'Installation & Uninstallation',
    description: 'Install, uninstall, and cleanup procedures with data preservation guarantees',
    required: true,
    generate: generateInstallUninstall,
  },
  {
    id: 'updates-maintenance',
    filename: '17-updates-maintenance.md',
    title: 'Updates & Maintenance',
    description: 'Update strategy, versioning, rollback, deprecation, and maintenance windows',
    required: true,
    generate: generateUpdatesMaintenance,
  },
]

export function getDocsCatalog(): DocTemplate[] {
  return DOCS_CATALOG
}

export function getRequiredDocs(): DocTemplate[] {
  return DOCS_CATALOG.filter(d => d.required)
}

export function generateProjectDocs(config: DevSentinelConfig, projectRoot: string, selectedIds?: string[]): string[] {
  const docsDir = join(projectRoot, 'docs')
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true })

  const templates = selectedIds
    ? DOCS_CATALOG.filter(d => selectedIds.includes(d.id))
    : DOCS_CATALOG

  const written: string[] = []

  for (const template of templates) {
    const filepath = join(docsDir, template.filename)
    if (existsSync(filepath)) continue

    const content = template.generate(config)
    writeFileSync(filepath, content, 'utf-8')
    written.push(template.filename)
  }

  return written
}

// ─── Template generators ────────────────────────────────────────────────────

function header(title: string, project: string): string {
  return `# ${title}
> **Project:** ${project}
> **Generated by:** DevSentinel ${VERSION}
> **Date:** ${new Date().toISOString().slice(0, 10)}
> **Status:** Draft — requires team review and completion

---
`
}

function generateMasterDocument(config: DevSentinelConfig): string {
  const stack = config.stack.length > 0 ? config.stack.join(', ') : '_To be defined_'
  const agents = config.agents.allowed.join(', ')
  const protectedCount = config.scope.protected.length
  const controlCount = Object.values(config.controls).flat().length

  return `${header('Documento Maestro', config.project)}

## 1. Resumen ejecutivo

**${config.project}** es un proyecto de software bajo gobernanza de DevSentinel.
Este documento sirve como referencia central para todas las decisiones técnicas,
restricciones operativas y lineamientos del proyecto.

| Aspecto | Valor |
|---|---|
| Nombre del proyecto | ${config.project} |
| Stack autorizado | ${stack} |
| Agentes IA permitidos | ${agents} |
| Archivos protegidos | ${protectedCount} patrones |
| Controles activos | ${controlCount} |
| Rama principal | ${config.git.mainBranch} |

## 2. Visión del producto

<!-- Describe la visión del producto en 2-3 oraciones -->
_Completar: ¿Qué problema resuelve? ¿Para quién? ¿Qué lo diferencia?_

## 3. Alcance del proyecto

### Incluido en el alcance
<!-- Lista las funcionalidades o módulos que están dentro del alcance -->
- [ ] _Funcionalidad 1_
- [ ] _Funcionalidad 2_
- [ ] _Funcionalidad 3_

### Fuera del alcance
<!-- Lista explícitamente lo que NO se incluirá -->
- _Exclusión 1_
- _Exclusión 2_

## 4. Objetivos y métricas de éxito

| Objetivo | Métrica | Target |
|---|---|---|
| _Objetivo 1_ | _Métrica medible_ | _Valor target_ |
| _Objetivo 2_ | _Métrica medible_ | _Valor target_ |

## 5. Stakeholders

| Rol | Persona/Equipo | Responsabilidad |
|---|---|---|
| Product Owner | _Nombre_ | Decisiones de producto |
| Tech Lead | _Nombre_ | Arquitectura y stack |
| Developer | _Nombre_ | Implementación |

## 6. Cronograma de alto nivel

| Fase | Inicio | Fin | Entregable |
|---|---|---|---|
| Fase 1 — MVP | _Fecha_ | _Fecha_ | _Descripción_ |
| Fase 2 — Beta | _Fecha_ | _Fecha_ | _Descripción_ |
| Fase 3 — Release | _Fecha_ | _Fecha_ | _Descripción_ |

## 7. Restricciones y supuestos

### Restricciones
- Stack tecnológico fijo: ${stack}
- Agentes IA autorizados: ${agents}
- Archivos protegidos no modificables sin aprobación

### Supuestos
- _Supuesto 1_
- _Supuesto 2_

## 8. Documentos relacionados

| Documento | Ubicación | Propósito |
|---|---|---|
| Project Brief | \`docs/01-project-brief.md\` | Objetivos y contexto |
| Stack Definition | \`docs/02-stack-definition.md\` | Tecnologías autorizadas |
| Architecture | \`docs/03-architecture.md\` | Diseño técnico |
| Data Model | \`docs/04-data-model.md\` | Modelo de datos |
| UI Design | \`docs/05-ui-design.md\` | Sistema visual |
| API Contracts | \`docs/06-api-contracts.md\` | Contratos de API |
| Security Rules | \`docs/07-security-rules.md\` | Políticas de seguridad |
| Agent Rules | \`docs/08-agent-rules.md\` | Reglas para agentes IA |
| Change Log | \`docs/09-change-log.md\` | Registro de cambios |
| Risk Register | \`docs/10-risk-register.md\` | Registro de riesgos |

---
*Este documento debe mantenerse actualizado como referencia central del proyecto.*
`
}

function generateProjectBrief(config: DevSentinelConfig): string {
  return `${header('Project Brief', config.project)}

## 1. Contexto del proyecto

<!-- Describe el contexto y la motivación del proyecto -->
_¿Por qué existe este proyecto? ¿Qué problema del negocio o del usuario resuelve?_

## 2. Problema

<!-- Describe el problema específico que este proyecto resuelve -->
_¿Qué dolor tiene el usuario? ¿Cómo lo resuelve actualmente? ¿Por qué eso no es suficiente?_

## 3. Solución propuesta

<!-- Describe la solución en términos de producto -->
_¿Qué hará el producto? ¿Cómo resolverá el problema descrito?_

## 4. Usuarios objetivo

| Perfil | Descripción | Necesidad principal |
|---|---|---|
| _Perfil 1_ | _Descripción_ | _Necesidad_ |
| _Perfil 2_ | _Descripción_ | _Necesidad_ |

## 5. Criterios de éxito

- [ ] _Criterio 1: resultado medible esperado_
- [ ] _Criterio 2: resultado medible esperado_
- [ ] _Criterio 3: resultado medible esperado_

## 6. Requisitos funcionales principales

| ID | Requisito | Prioridad | Estado |
|---|---|---|---|
| RF-001 | _Descripción del requisito_ | Alta | Pendiente |
| RF-002 | _Descripción del requisito_ | Media | Pendiente |
| RF-003 | _Descripción del requisito_ | Baja | Pendiente |

## 7. Requisitos no funcionales

| ID | Requisito | Categoría |
|---|---|---|
| RNF-001 | _Descripción_ | Rendimiento |
| RNF-002 | _Descripción_ | Seguridad |
| RNF-003 | _Descripción_ | Usabilidad |

## 8. Dependencias externas

<!-- Lista servicios, APIs o sistemas externos de los que depende el proyecto -->
- _Dependencia 1_
- _Dependencia 2_

## 9. Riesgos identificados

_Ver documento completo en \`docs/10-risk-register.md\`_

---
*Mantener este documento actualizado conforme evolucionen los requisitos.*
`
}

function generateStackDefinition(config: DevSentinelConfig): string {
  const stack = config.stack
  const stackList = stack.length > 0
    ? stack.map(s => `- **${s}**`).join('\n')
    : '- _No definido aún — completar antes de iniciar desarrollo_'

  const agents = config.agents.allowed
  const defaultAgent = config.agents.default

  return `${header('Stack Definition', config.project)}

## 1. Stack autorizado

El siguiente stack tecnológico está autorizado para este proyecto.
**No se permite agregar tecnologías fuera de esta lista sin aprobación explícita.**

### Tecnologías aprobadas

${stackList}

### Justificación

<!-- Explica por qué se eligió cada tecnología -->
| Tecnología | Razón de elección | Alternativas evaluadas |
|---|---|---|
${stack.map(s => `| ${s} | _Razón_ | _Alternativas_ |`).join('\n')}

## 2. Agentes IA autorizados

| Agente | Rol | Estado |
|---|---|---|
${agents.map(a => `| ${a} | ${a === defaultAgent ? 'Principal' : 'Secundario'} | Autorizado |`).join('\n')}

**Agente por defecto:** ${defaultAgent}

## 3. Package Manager

_Especificar: npm / pnpm / yarn / bun_

## 4. Dependencias base

### Producción
<!-- Lista las dependencias principales de producción -->
| Paquete | Versión | Propósito |
|---|---|---|
| _paquete_ | _versión_ | _para qué se usa_ |

### Desarrollo
| Paquete | Versión | Propósito |
|---|---|---|
| _paquete_ | _versión_ | _para qué se usa_ |

## 5. Restricciones del stack

### Prohibiciones
- No cambiar el framework principal sin aprobación del Tech Lead
- No agregar ORMs o SDKs alternativos a los definidos
- No reemplazar la biblioteca de UI autorizada
- No introducir lenguajes de programación adicionales sin justificación

### Reglas de dependencias
- Todas las dependencias deben usar versiones exactas (pinned)
- No se permite \`*\` ni \`latest\` como versión
- Toda nueva dependencia requiere justificación documentada
- Verificar que el paquete existe en el registro oficial antes de instalar

## 6. Entorno de desarrollo

| Aspecto | Valor |
|---|---|
| Node.js mínimo | _versión_ |
| Sistema operativo | Windows / macOS / Linux |
| IDE recomendado | _editor_ |
| Linter | _herramienta_ |
| Formatter | _herramienta_ |
| Test runner | _herramienta_ |

## 7. Convenciones del stack

### Estructura de archivos
\`\`\`
src/
├── domain/          # Lógica de negocio pura
├── application/     # Casos de uso
├── infrastructure/  # Implementaciones externas
├── interfaces/      # Controladores, rutas, UI
└── shared/          # Utilidades compartidas
\`\`\`

### Naming conventions
- Archivos: \`kebab-case.ts\` para módulos, \`PascalCase.ts\` para clases
- Variables/funciones: \`camelCase\`
- Constantes: \`SCREAMING_SNAKE_CASE\`
- Tipos/Interfaces: \`PascalCase\`

---
*Cualquier cambio en el stack debe documentarse aquí y requiere aprobación.*
`
}

function generateArchitecture(config: DevSentinelConfig): string {
  const stack = config.stack.join(', ') || '_Por definir_'

  return `${header('Architecture', config.project)}

## 1. Visión arquitectónica

<!-- Describe la arquitectura general del sistema en 2-3 párrafos -->
_¿Qué tipo de arquitectura sigue el proyecto? ¿Monolito, microservicios, serverless, layered?_

**Stack:** ${stack}

## 2. Diagrama de alto nivel

\`\`\`
┌─────────────────────────────────────────────┐
│                  Interfaces                  │
│            (UI / API / CLI / Ext)            │
├─────────────────────────────────────────────┤
│                 Application                  │
│          (Use Cases / Orchestration)          │
├─────────────────────────────────────────────┤
│                   Domain                     │
│        (Entities / Business Rules)           │
├─────────────────────────────────────────────┤
│               Infrastructure                 │
│     (DB / External APIs / File System)       │
└─────────────────────────────────────────────┘
\`\`\`

## 3. Capas del sistema

### Capa de Interfaces
- **Responsabilidad:** Recibir input externo y devolver output
- **Contenido:** Controladores, rutas, componentes UI, comandos CLI
- **Regla:** Solo importa de Application

### Capa de Application
- **Responsabilidad:** Orquestar casos de uso
- **Contenido:** Services, use cases, DTOs
- **Regla:** Importa de Domain, no de Infrastructure directamente

### Capa de Domain
- **Responsabilidad:** Lógica de negocio pura
- **Contenido:** Entities, value objects, domain events, interfaces
- **Regla:** Sin dependencias externas

### Capa de Infrastructure
- **Responsabilidad:** Implementaciones concretas
- **Contenido:** Repositorios, adaptadores, clientes externos
- **Regla:** Implementa interfaces definidas en Domain

## 4. Componentes principales

| Componente | Capa | Responsabilidad | Dependencias |
|---|---|---|---|
| _Componente 1_ | _Capa_ | _Qué hace_ | _De qué depende_ |
| _Componente 2_ | _Capa_ | _Qué hace_ | _De qué depende_ |

## 5. Flujos principales

### Flujo 1: _Nombre del flujo_
\`\`\`
Usuario → Interface → Application → Domain → Infrastructure → DB
                                                      ↓
                                               Response ← ← ←
\`\`\`

## 6. Patrones de diseño aplicados

| Patrón | Dónde se aplica | Justificación |
|---|---|---|
| _Repository_ | Acceso a datos | Abstracción de persistencia |
| _Use Case_ | Application layer | Separación de responsabilidades |
| _Dependency Injection_ | Todo el sistema | Inversión de dependencias |

## 7. Decisiones arquitectónicas (ADR)

### ADR-001: _Título de la decisión_
- **Contexto:** _Situación que requirió la decisión_
- **Decisión:** _Qué se decidió_
- **Consecuencias:** _Impacto positivo y negativo_

## 8. Restricciones técnicas

- No hacer llamadas a base de datos desde la capa de interfaces
- No acoplar lógica de negocio a frameworks específicos
- No crear dependencias circulares entre módulos
- Máximo una dependencia de base de datos por servicio

---
*Actualizar este documento ante cualquier cambio arquitectónico significativo.*
`
}

function generateDataModel(config: DevSentinelConfig): string {
  return `${header('Data Model', config.project)}

## 1. Diagrama de entidades

\`\`\`
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Entity1 │────→│ Entity2  │←────│ Entity3  │
│          │     │          │     │          │
│ - id     │     │ - id     │     │ - id     │
│ - name   │     │ - ref_id │     │ - ref_id │
│ - status │     │ - data   │     │ - type   │
└──────────┘     └──────────┘     └──────────┘
\`\`\`

## 2. Entidades principales

### Entity 1: _Nombre_
| Campo | Tipo | Nullable | Descripción |
|---|---|---|---|
| id | UUID/TEXT | No | Identificador único |
| created_at | TIMESTAMP | No | Fecha de creación |
| updated_at | TIMESTAMP | No | Última modificación |

### Entity 2: _Nombre_
| Campo | Tipo | Nullable | Descripción |
|---|---|---|---|
| id | UUID/TEXT | No | Identificador único |
| created_at | TIMESTAMP | No | Fecha de creación |

## 3. Relaciones

| Origen | Destino | Tipo | Descripción |
|---|---|---|---|
| _Entity1_ | _Entity2_ | 1:N | _Descripción de la relación_ |
| _Entity2_ | _Entity3_ | N:M | _Descripción de la relación_ |

## 4. Índices

| Tabla | Columna(s) | Tipo | Justificación |
|---|---|---|---|
| _tabla_ | _columna_ | B-Tree | Búsquedas frecuentes |

## 5. Migraciones

| Versión | Descripción | Fecha | Autor |
|---|---|---|---|
| V001 | Schema inicial | _Fecha_ | _Autor_ |

## 6. Reglas de datos

- Todos los IDs deben ser UUID v4 o nanoid
- Timestamps en formato ISO 8601 (UTC)
- Soft delete por defecto (campo \`deleted_at\`)
- No almacenar datos sensibles sin cifrado

## 7. Datos de prueba

<!-- Describir estrategia de seeding para desarrollo -->
- Seeds de desarrollo en: \`scripts/seed.ts\`
- Usar datos ficticios — nunca datos reales

---
*Actualizar ante cambios en el esquema. Toda migración requiere aprobación.*
`
}

function generateUIDesign(config: DevSentinelConfig): string {
  const stack = config.stack.join(', ') || '_Por definir_'

  return `${header('UI/UX Design System', config.project)}

## 1. Principios visuales

- Interfaz limpia, profesional y funcional
- Evitar diseños genéricos de dashboard
- Priorizar jerarquía visual clara
- Usar componentes reutilizables del sistema
- Mantener coherencia entre todas las pantallas
- Diseño responsive por defecto

## 2. Stack visual

**Tecnologías:** ${stack}

| Aspecto | Tecnología | Notas |
|---|---|---|
| Framework UI | _Ej: React_ | _Versión_ |
| Componentes | _Ej: shadcn/ui_ | _Catálogo_ |
| Estilos | _Ej: Tailwind CSS_ | _Configuración_ |
| Iconos | _Ej: Lucide_ | _Set autorizado_ |
| Animaciones | _Ej: Framer Motion_ | _Uso moderado_ |

## 3. Tipografía

| Uso | Fuente | Peso | Tamaño |
|---|---|---|---|
| Títulos H1 | _Fuente_ | Bold (700) | 2rem / 32px |
| Títulos H2 | _Fuente_ | Semibold (600) | 1.5rem / 24px |
| Títulos H3 | _Fuente_ | Medium (500) | 1.25rem / 20px |
| Cuerpo | _Fuente_ | Regular (400) | 1rem / 16px |
| Etiquetas | _Fuente_ | Medium (500) | 0.875rem / 14px |
| Código | Mono | Regular (400) | 0.875rem / 14px |

## 4. Paleta de colores

| Nombre | Valor | Uso |
|---|---|---|
| Primary | \`#_____\` | Acciones principales, links |
| Secondary | \`#_____\` | Acciones secundarias |
| Background | \`#_____\` | Fondo general |
| Surface | \`#_____\` | Tarjetas, modales |
| Text Primary | \`#_____\` | Texto principal |
| Text Secondary | \`#_____\` | Texto auxiliar |
| Success | \`#22c55e\` | Confirmaciones, estados exitosos |
| Warning | \`#f59e0b\` | Alertas, precauciones |
| Error | \`#ef4444\` | Errores, acciones destructivas |
| Info | \`#3b82f6\` | Información, ayuda |

## 5. Componentes autorizados

### Base
- Button (primary, secondary, outline, ghost, destructive)
- Input (text, email, password, search, number)
- Select / Dropdown
- Checkbox / Radio
- Toggle / Switch
- Badge / Tag

### Layout
- Card
- Modal / Dialog
- Sidebar
- Navbar / Header
- Tabs
- Accordion

### Data
- Table (con sort, filter, pagination)
- List
- Chart (si aplica)

### Feedback
- Toast / Notification
- Alert
- Progress / Spinner
- Skeleton loader
- Empty state
- Error state

## 6. Espaciado

| Token | Valor | Uso |
|---|---|---|
| xs | 4px | Separaciones mínimas |
| sm | 8px | Padding interno compacto |
| md | 16px | Padding estándar |
| lg | 24px | Separación entre secciones |
| xl | 32px | Márgenes principales |
| 2xl | 48px | Espaciado entre bloques |

## 7. Breakpoints (responsive)

| Nombre | Ancho mínimo | Uso |
|---|---|---|
| mobile | 0px | Diseño base |
| tablet | 768px | Tablets, landscape phones |
| desktop | 1024px | Escritorio estándar |
| wide | 1280px | Pantallas grandes |

## 8. Reglas para agentes IA

- **No crear nuevos estilos** si ya existe un componente reutilizable
- **No usar colores arbitrarios** — solo los definidos en la paleta
- **No crear botones sin jerarquía** — usar variantes definidas
- **No crear formularios sin estados** de error, carga y éxito
- **No crear pantallas sin responsive** — todo debe funcionar en mobile
- **No duplicar componentes** — buscar en el catálogo primero
- **No usar estilos inline** excepto para valores dinámicos calculados
- **No crear tablas sin** loading, error y empty state

## 9. Pantallas principales

| Pantalla | Ruta | Descripción | Estado |
|---|---|---|---|
| _Pantalla 1_ | _/ruta_ | _Descripción_ | Pendiente |
| _Pantalla 2_ | _/ruta_ | _Descripción_ | Pendiente |

## 10. Wireframes de referencia

<!-- Agregar wireframes o mockups como imágenes o diagramas ASCII -->
_Completar con wireframes del diseño aprobado_

---
*El agente IA debe consultar este documento antes de crear o modificar interfaces.*
`
}

function generateAPIContracts(config: DevSentinelConfig): string {
  return `${header('API Contracts', config.project)}

## 1. Información general

| Aspecto | Valor |
|---|---|
| Base URL | \`/api/v1\` |
| Formato | JSON |
| Autenticación | _Definir: JWT / API Key / OAuth_ |
| Versionado | URL path (\`/v1/\`, \`/v2/\`) |

## 2. Convenciones

### Métodos HTTP
| Método | Uso |
|---|---|
| GET | Lectura de recursos |
| POST | Creación de recursos |
| PUT | Reemplazo completo de recurso |
| PATCH | Actualización parcial |
| DELETE | Eliminación (soft delete preferido) |

### Códigos de respuesta
| Código | Significado |
|---|---|
| 200 | OK — operación exitosa |
| 201 | Created — recurso creado |
| 400 | Bad Request — error en los datos enviados |
| 401 | Unauthorized — no autenticado |
| 403 | Forbidden — sin permisos |
| 404 | Not Found — recurso no existe |
| 422 | Unprocessable Entity — validación fallida |
| 500 | Internal Server Error |

### Estructura de respuesta estándar
\`\`\`json
{
  "data": { },
  "meta": { "page": 1, "total": 100 },
  "error": null
}
\`\`\`

### Estructura de error estándar
\`\`\`json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of the error",
    "details": [
      { "field": "email", "message": "Invalid format" }
    ]
  }
}
\`\`\`

## 3. Endpoints

### Resource 1: _Nombre_

#### GET /api/v1/_resource_
Lista recursos con paginación.

**Query params:**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| page | number | 1 | Página actual |
| limit | number | 20 | Resultados por página |
| sort | string | created_at | Campo de ordenamiento |

**Response 200:**
\`\`\`json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
\`\`\`

#### POST /api/v1/_resource_
Crea un recurso.

**Body:**
\`\`\`json
{
  "field1": "value",
  "field2": "value"
}
\`\`\`

**Response 201:**
\`\`\`json
{
  "data": { "id": "...", "field1": "value" }
}
\`\`\`

## 4. Autenticación

<!-- Describir el mecanismo de autenticación -->
_Definir: JWT tokens, API keys, OAuth 2.0, etc._

## 5. Rate limiting

| Tier | Límite | Ventana |
|---|---|---|
| Default | _N_ requests | _tiempo_ |
| Authenticated | _N_ requests | _tiempo_ |

---
*Actualizar ante cambios en la API. Todo endpoint nuevo debe documentarse aquí.*
`
}

function generateSecurityRules(config: DevSentinelConfig): string {
  const protectedPaths = config.scope.protected
  const blockedPatterns = config.skills.blockedBashPatterns

  return `${header('Security Rules', config.project)}

## 1. Principios de seguridad

- Seguridad por defecto — todo está restringido hasta que se autoriza explícitamente
- Mínimo privilegio — cada componente solo accede a lo que necesita
- Defensa en profundidad — múltiples capas de protección
- Auditoría completa — toda acción relevante queda registrada

## 2. Archivos y rutas protegidas

Los siguientes archivos y rutas están protegidos por DevSentinel.
**No se pueden modificar sin aprobación explícita.**

| Patrón | Nivel de riesgo | Acción |
|---|---|---|
${protectedPaths.map(p => `| \`${p}\` | Alto | Requiere aprobación |`).join('\n')}

## 3. Comandos bloqueados

Los siguientes patrones de comandos están bloqueados por defecto:

${blockedPatterns.map(p => `- \`${p}\``).join('\n')}

## 4. Autenticación

<!-- Definir el mecanismo de autenticación del proyecto -->
| Aspecto | Implementación |
|---|---|
| Método | _Definir_ |
| Almacenamiento de tokens | _Definir_ |
| Expiración | _Definir_ |
| Refresh | _Definir_ |

### Reglas
- Nunca almacenar passwords en texto plano
- Usar bcrypt o argon2 para hashing de contraseñas
- Tokens con expiración corta + refresh token
- No exponer tokens en URLs o logs

## 5. Autorización

| Rol | Permisos |
|---|---|
| _Rol 1_ | _Lista de permisos_ |
| _Rol 2_ | _Lista de permisos_ |

## 6. Protección de datos

### Datos sensibles
- Variables de entorno: nunca en código, siempre en \`.env\`
- API keys: rotación periódica, nunca en repositorio
- Datos personales: cifrado en reposo, consentimiento explícito

### Reglas OWASP aplicadas
- A01: Broken Access Control — middleware de autenticación obligatorio
- A02: Cryptographic Failures — cifrado de datos sensibles
- A03: Injection — queries parametrizadas, no interpolación
- A07: XSS — sanitización de input, escape de output

## 7. Validación de input

- Validar todos los inputs en el boundary del sistema
- Usar schemas de validación (Zod, Joi, class-validator)
- Sanitizar HTML/SQL antes de procesar
- Limitar tamaño de payloads

## 8. Logging y monitoreo

### Qué registrar
- Intentos de autenticación (exitosos y fallidos)
- Accesos a datos sensibles
- Cambios en permisos o configuración
- Errores del sistema

### Qué NO registrar
- Passwords o tokens
- Datos personales completos
- Contenido de archivos sensibles

## 9. Compliance

<!-- Indicar regulaciones aplicables -->
| Regulación | Aplica | Estado |
|---|---|---|
| RGPD | _Sí/No_ | _Estado_ |
| SOC 2 | _Sí/No_ | _Estado_ |
| PCI DSS | _Sí/No_ | _Estado_ |

---
*Todo cambio en reglas de seguridad requiere revisión y aprobación.*
`
}

function generateAgentRules(config: DevSentinelConfig): string {
  const agents = config.agents.allowed.join(', ')
  const scope = config.scope.allowed.join(', ')
  const protectedPaths = config.scope.protected.join(', ')
  const controlCount = Object.values(config.controls).flat().length
  const blockedPatterns = config.skills.blockedBashPatterns

  return `${header('Agent Rules', config.project)}

## 1. Gobernanza general

Este proyecto está bajo control de DevSentinel.
**Todo agente IA debe seguir estas reglas sin excepción.**

| Aspecto | Valor |
|---|---|
| Agentes autorizados | ${agents} |
| Controles activos | ${controlCount} |
| Modo de operación | Gobernado por DevSentinel |

## 2. Reglas obligatorias

1. **No eliminar archivos** — crear versiones nuevas en su lugar
2. **No modificar dependencias** sin aprobación explícita
3. **No cambiar el stack** definido en \`docs/02-stack-definition.md\`
4. **No modificar autenticación** sin aprobación reforzada
5. **No modificar base de datos** sin aprobación reforzada
6. **No modificar pagos** sin aprobación reforzada
7. **No modificar archivos \`.env\`** — están bloqueados
8. **No tocar producción** — deployments fuera de alcance del agente
9. **No ejecutar comandos destructivos** — ver lista en sección 5
10. **No reescribir archivos completos** si un cambio parcial es suficiente
11. **Antes de modificar más de 3 archivos**, presentar plan
12. **Después de cada cambio**, entregar resumen técnico

## 3. Alcance de archivos

### Directorios autorizados
\`${scope}\`

### Archivos/rutas protegidos (nunca modificar)
\`${protectedPaths}\`

## 4. Herramientas autorizadas

| Herramienta | Estado |
|---|---|
${config.skills.allowedTools.map(t => `| ${t} | Permitido |`).join('\n')}
${config.skills.approvalRequired.map(t => `| ${t} | Requiere aprobación |`).join('\n')}
${config.skills.blockedTools.map(t => `| ${t} | Bloqueado |`).join('\n')}

## 5. Comandos bloqueados

${blockedPatterns.map(p => `- \`${p}\``).join('\n')}

## 6. Flujo de trabajo del agente

1. Leer documentos del proyecto antes de empezar:
   - \`docs/00-master-document.md\`
   - \`docs/03-architecture.md\`
   - \`docs/05-ui-design.md\`
   - \`docs/08-agent-rules.md\` (este documento)
2. Presentar plan antes de ejecutar cambios
3. Indicar archivos que se tocarán
4. Esperar aprobación antes de modificar
5. Ejecutar cambios dentro del alcance
6. Entregar resumen técnico al finalizar
7. Incluir pruebas o justificar por qué no aplican

## 7. Comportamiento esperado

### Debe hacer
- Respetar la arquitectura documentada
- Seguir el sistema de diseño UI
- Usar convenciones de naming del proyecto
- Escribir tests para código nuevo
- Documentar decisiones no obvias

### No debe hacer
- Crear UI genérica fuera del sistema visual
- Introducir librerías fuera del stack
- Hacer refactorizaciones no solicitadas
- Cambiar configuración global
- Ignorar las reglas de seguridad

---
*Este documento se regenera con \`devsentinel inject\`. Cambios manuales serán sobrescritos.*
`
}

function generateChangeLog(config: DevSentinelConfig): string {
  const today = new Date().toISOString().slice(0, 10)

  return `${header('Change Log', config.project)}

Formato basado en [Keep a Changelog 1.0.0](https://keepachangelog.com/).
Versionado siguiendo [Semantic Versioning 2.0.0](https://semver.org/).

---

## [Unreleased]

### Added
- Inicialización del proyecto con DevSentinel
- Documentación base generada automáticamente

### Changed
_Sin cambios registrados_

### Fixed
_Sin correcciones registradas_

---

## [0.1.0] — ${today}

### Added
- Setup inicial del proyecto
- Configuración de DevSentinel
- Estructura de documentación

---

<!-- Plantilla para nuevas entradas:

## [X.Y.Z] — YYYY-MM-DD

### Added
- Nuevas funcionalidades

### Changed
- Cambios en funcionalidades existentes

### Deprecated
- Funcionalidades que serán removidas

### Removed
- Funcionalidades eliminadas

### Fixed
- Corrección de bugs

### Security
- Correcciones de seguridad

-->
`
}

function generateRiskRegister(config: DevSentinelConfig): string {
  return `${header('Risk Register', config.project)}

## Escala de severidad

| Nivel | Color | Descripción |
|---|---|---|
| Bajo | Verde | Impacto menor, fácil de mitigar |
| Medio | Amarillo | Impacto moderado, requiere plan de acción |
| Alto | Naranja | Impacto significativo, requiere atención inmediata |
| Crítico | Rojo | Impacto severo, puede bloquear el proyecto |

## Riesgos identificados

| ID | Riesgo | Severidad | Probabilidad | Impacto | Mitigación | Estado | Responsable |
|---|---|---|---|---|---|---|---|
| R-001 | _Descripción del riesgo_ | _Nivel_ | _Alta/Media/Baja_ | _Descripción del impacto_ | _Plan de mitigación_ | Abierto | _Nombre_ |
| R-002 | _Descripción del riesgo_ | _Nivel_ | _Alta/Media/Baja_ | _Descripción del impacto_ | _Plan de mitigación_ | Abierto | _Nombre_ |

## Riesgos técnicos comunes

<!-- Evaluar y completar según aplique -->

| ID | Riesgo | Aplica | Mitigación |
|---|---|---|---|
| RT-001 | Pérdida de datos por falta de backups | _Sí/No_ | _Plan_ |
| RT-002 | Vulnerabilidades en dependencias | _Sí/No_ | _Plan_ |
| RT-003 | Deuda técnica acumulada | _Sí/No_ | _Plan_ |
| RT-004 | Cambio de stack no planificado | _Sí/No_ | DevSentinel previene |
| RT-005 | Eliminación accidental de archivos | _Sí/No_ | DevSentinel bloquea |
| RT-006 | Cambios en auth sin revisión | _Sí/No_ | DevSentinel requiere aprobación |
| RT-007 | Exposición de secretos en código | _Sí/No_ | DevSentinel detecta y bloquea |
| RT-008 | Cambios fuera de alcance por agente IA | _Sí/No_ | DevSentinel monitorea scope |

## Historial de incidentes

| Fecha | Descripción | Severidad | Resolución | Lección aprendida |
|---|---|---|---|---|
| _Fecha_ | _Descripción_ | _Nivel_ | _Cómo se resolvió_ | _Qué se aprendió_ |

---
*Revisar este registro al inicio de cada sprint o sesión de trabajo.*
`
}

function generateLegalCompliance(config: DevSentinelConfig): string {
  return `${header('Legal & Compliance', config.project)}

## 1. Marco legal aplicable

Este documento define las obligaciones legales y de cumplimiento normativo del proyecto.
**Todo desarrollo debe respetar las regulaciones aquí documentadas.**

### Regulaciones aplicables

| Regulación | Ámbito | Aplica | Estado de cumplimiento |
|---|---|---|---|
| RGPD (EU 2016/679) | Protección de datos personales — UE | _Sí/No_ | _Estado_ |
| LOPDGDD (ES) | Protección de datos — España | _Sí/No_ | _Estado_ |
| CCPA (California) | Privacidad del consumidor — USA | _Sí/No_ | _Estado_ |
| LSSI-CE (ES) | Servicios de la sociedad de información | _Sí/No_ | _Estado_ |
| ePrivacy Directive | Cookies y comunicaciones electrónicas | _Sí/No_ | _Estado_ |
| PCI DSS | Datos de tarjetas de pago | _Sí/No_ | _Estado_ |
| SOC 2 | Controles de seguridad organizacional | _Sí/No_ | _Estado_ |
| ISO 27001 | Seguridad de la información | _Sí/No_ | _Estado_ |
| HIPAA | Datos de salud — USA | _Sí/No_ | _Estado_ |

## 2. Términos de servicio (ToS)

### Elementos obligatorios
- [ ] Descripción del servicio y sus limitaciones
- [ ] Condiciones de uso aceptable
- [ ] Responsabilidades del usuario
- [ ] Limitación de responsabilidad del proveedor
- [ ] Propiedad intelectual y contenido generado
- [ ] Condiciones de terminación del servicio
- [ ] Legislación aplicable y jurisdicción
- [ ] Mecanismos de resolución de disputas

### Ubicación
| Documento | Ruta | Estado |
|---|---|---|
| Términos de servicio | _/terms_ | Pendiente |
| Aviso legal | _/legal_ | Pendiente |

## 3. Política de privacidad

### Contenido mínimo (RGPD Art. 13-14)
- [ ] Identidad del responsable del tratamiento
- [ ] Datos de contacto del DPO (si aplica)
- [ ] Finalidades del tratamiento y base legal
- [ ] Destinatarios de los datos
- [ ] Transferencias internacionales
- [ ] Plazos de conservación
- [ ] Derechos del interesado (acceso, rectificación, supresión, portabilidad, oposición)
- [ ] Derecho a presentar reclamación ante la autoridad de control
- [ ] Existencia de decisiones automatizadas / perfilado

### Ubicación
| Documento | Ruta | Estado |
|---|---|---|
| Política de privacidad | _/privacy_ | Pendiente |

## 4. Política de cookies

### Categorías de cookies
| Tipo | Propósito | Consentimiento requerido |
|---|---|---|
| Estrictamente necesarias | Funcionamiento básico | No |
| Funcionales | Preferencias del usuario | Sí |
| Analíticas | Medición de uso | Sí |
| Publicitarias | Publicidad personalizada | Sí |

### Requisitos técnicos
- [ ] Banner de consentimiento antes de cargar cookies no esenciales
- [ ] Granularidad de consentimiento por categoría
- [ ] Opción de rechazar todas las no esenciales
- [ ] Registro de consentimiento con timestamp
- [ ] Opción de retirar consentimiento en cualquier momento
- [ ] No cargar scripts de terceros hasta obtener consentimiento

## 5. Derechos del usuario (ARCO+)

El sistema debe implementar mecanismos técnicos para:

| Derecho | Artículo RGPD | Implementación requerida | Estado |
|---|---|---|---|
| Acceso | Art. 15 | Endpoint/UI para descargar datos personales | Pendiente |
| Rectificación | Art. 16 | Permitir edición de datos personales | Pendiente |
| Supresión | Art. 17 | Eliminación completa de datos del usuario | Pendiente |
| Portabilidad | Art. 20 | Exportación en formato máquina (JSON/CSV) | Pendiente |
| Oposición | Art. 21 | Opt-out de procesamientos específicos | Pendiente |
| Limitación | Art. 18 | Marcar datos como "solo almacenamiento" | Pendiente |

## 6. Propiedad intelectual

| Aspecto | Política |
|---|---|
| Código fuente | _Licencia del proyecto — ver docs/12-licensing.md_ |
| Contenido generado por usuario | _Definir propiedad_ |
| Contenido generado por IA | _Definir propiedad y atribución_ |
| Marcas registradas | _Lista de marcas protegidas_ |
| Dependencias de terceros | _Ver análisis de licencias en docs/12-licensing.md_ |

## 7. Requisitos de consentimiento

| Acción | Tipo de consentimiento | Registro |
|---|---|---|
| Crear cuenta | Explícito (opt-in) | Timestamp + IP + versión ToS |
| Recopilar datos de uso | Granular por categoría | Timestamp + preferencias |
| Enviar comunicaciones | Opt-in explícito | Timestamp + canal |
| Compartir datos con terceros | Opt-in explícito | Timestamp + destinatario |

## 8. Auditoría de compliance

| Check | Frecuencia | Responsable | Última revisión |
|---|---|---|---|
| Revisión de política de privacidad | Anual | _Nombre_ | _Fecha_ |
| Análisis de impacto (DPIA) | Ante cambios significativos | _Nombre_ | _Fecha_ |
| Revisión de consentimientos | Semestral | _Nombre_ | _Fecha_ |
| Auditoría de acceso a datos | Trimestral | _Nombre_ | _Fecha_ |
| Revisión de licencias de dependencias | Por release | _Nombre_ | _Fecha_ |

---
*Este documento debe revisarse ante cualquier cambio que afecte datos de usuarios o regulaciones aplicables.*
`
}

function generateLicensing(config: DevSentinelConfig): string {
  return `${header('Licensing', config.project)}

## 1. Licencia del proyecto

| Aspecto | Valor |
|---|---|
| Licencia principal | _Definir: MIT / Apache 2.0 / GPL / Propietaria_ |
| Archivo de licencia | \`LICENSE\` en raíz del repositorio |
| Copyright holder | _Nombre o empresa_ |
| Año | ${new Date().getFullYear()} |

### Texto de cabecera para archivos fuente
\`\`\`
// Copyright (c) ${new Date().getFullYear()} [Holder]. All rights reserved.
// Licensed under [LICENSE_TYPE]. See LICENSE file for details.
\`\`\`

## 2. Licencias de dependencias

### Licencias permitidas
Las siguientes licencias de dependencias son aceptables:

| Licencia | Tipo | Compatible con proyecto |
|---|---|---|
| MIT | Permisiva | Sí |
| Apache 2.0 | Permisiva | Sí |
| BSD 2-Clause | Permisiva | Sí |
| BSD 3-Clause | Permisiva | Sí |
| ISC | Permisiva | Sí |

### Licencias restringidas (requieren revisión)
| Licencia | Riesgo | Acción |
|---|---|---|
| GPL v2/v3 | Copyleft fuerte | Requiere revisión legal |
| LGPL | Copyleft débil | Aceptable como librería dinámica |
| AGPL | Copyleft de red | Generalmente prohibida |
| SSPL | Restricciones de servicio | Requiere revisión |
| Unlicense | Sin atribución | Aceptable con precaución |

### Licencias prohibidas
- Sin licencia (unlicensed/no-license)
- Licencias personalizadas no revisadas
- Licencias con restricciones de uso comercial (si el proyecto es comercial)

## 3. Auditoría de licencias

### Herramientas recomendadas
- \`license-checker\` — para Node.js
- \`cargo-license\` — para Rust
- \`pip-licenses\` — para Python

### Proceso
1. Ejecutar auditoría antes de cada release
2. Revisar nuevas dependencias al momento de agregarlas
3. Documentar excepciones aprobadas
4. Mantener registro de licencias de terceros

### Registro de excepciones

| Paquete | Licencia | Excepción aprobada por | Fecha | Justificación |
|---|---|---|---|---|
| _paquete_ | _licencia_ | _nombre_ | _fecha_ | _razón_ |

## 4. Distribución y redistribución

| Aspecto | Política |
|---|---|
| Distribución del binario | _Definir_ |
| Distribución del código fuente | _Definir_ |
| Modificaciones por terceros | _Definir_ |
| Uso comercial por terceros | _Definir_ |
| Atribución requerida | _Sí/No y cómo_ |

## 5. Contribuciones

| Aspecto | Política |
|---|---|
| CLA (Contributor License Agreement) | _Requerido/No requerido_ |
| DCO (Developer Certificate of Origin) | _Requerido/No requerido_ |
| Licencia de contribuciones | _Misma que el proyecto_ |
| Propiedad del código contribuido | _Política_ |

## 6. Marcas y assets

| Asset | Tipo | Propietario | Restricciones de uso |
|---|---|---|---|
| Logo del proyecto | Marca | _Propietario_ | _Restricciones_ |
| Nombre del producto | Marca | _Propietario_ | _Restricciones_ |
| Iconografía | Diseño | _Propietario/Licencia_ | _Restricciones_ |

---
*Revisar antes de cada release y ante la adición de nuevas dependencias.*
`
}

function generateRepositoryManagement(config: DevSentinelConfig): string {
  const mainBranch = config.git.mainBranch

  return `${header('Repository Management', config.project)}

## 1. Información del repositorio

| Aspecto | Valor |
|---|---|
| Plataforma | _GitHub / GitLab / Bitbucket_ |
| URL | _URL del repositorio_ |
| Visibilidad | _Público / Privado_ |
| Rama principal | \`${mainBranch}\` |
| Protección de rama | _Activada/Pendiente_ |

## 2. Estrategia de branching

### Modelo: _Git Flow / GitHub Flow / Trunk-based_

| Rama | Propósito | Protegida | Merge requiere |
|---|---|---|---|
| \`${mainBranch}\` | Producción estable | Sí | PR + Review + CI verde |
| \`develop\` | Integración de desarrollo | Sí | PR + CI verde |
| \`feature/*\` | Nuevas funcionalidades | No | — |
| \`fix/*\` | Corrección de bugs | No | — |
| \`hotfix/*\` | Correcciones urgentes en producción | No | — |
| \`release/*\` | Preparación de release | No | — |

### Convención de nombres de ramas
\`\`\`
feature/[ticket-id]-descripcion-corta
fix/[ticket-id]-descripcion-corta
hotfix/[ticket-id]-descripcion-corta
release/v[X.Y.Z]
\`\`\`

## 3. Política de commits

### Formato: Conventional Commits 1.0.0
\`\`\`
type(scope): description

[optional body]

[optional footer]
\`\`\`

### Tipos permitidos
| Tipo | Propósito |
|---|---|
| feat | Nueva funcionalidad |
| fix | Corrección de bug |
| docs | Documentación |
| style | Formato, semicolons, etc. |
| refactor | Reestructuración sin cambio funcional |
| test | Tests |
| chore | Mantenimiento, builds, CI |
| perf | Mejora de rendimiento |
| ci | Cambios en CI/CD |

## 4. Pull Requests

### Requisitos para merge
- [ ] Título descriptivo siguiendo Conventional Commits
- [ ] Descripción del cambio y motivación
- [ ] Tests pasando (CI verde)
- [ ] Type check pasando
- [ ] Lint pasando
- [ ] Al menos 1 review aprobatorio
- [ ] Sin conflictos con la rama destino
- [ ] Cambios dentro del scope autorizado

### Template de PR
\`\`\`markdown
## Descripción
<!-- Qué cambia y por qué -->

## Tipo de cambio
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Docs

## Checklist
- [ ] Tests escritos/actualizados
- [ ] Documentación actualizada
- [ ] Sin breaking changes (o documentados)
- [ ] Revisado visualmente (si aplica UI)
\`\`\`

## 5. CI/CD Pipeline

| Stage | Herramienta | Trigger | Descripción |
|---|---|---|---|
| Lint | _ESLint_ | PR + Push | Validación de estilo |
| Type Check | _tsc_ | PR + Push | Validación de tipos |
| Test | _Vitest/Jest_ | PR + Push | Tests unitarios e integración |
| Build | _tsup/vite_ | PR + Push | Compilación |
| Security | _npm audit_ | Semanal + PR | Auditoría de dependencias |
| Deploy | _Definir_ | Merge a main | Despliegue a producción |

## 6. Proceso de release

1. Crear rama \`release/vX.Y.Z\` desde \`develop\`
2. Actualizar versión en \`package.json\`
3. Actualizar \`CHANGELOG.md\`
4. Ejecutar suite completa de tests
5. Crear PR hacia \`${mainBranch}\`
6. Review y aprobación
7. Merge y tag \`vX.Y.Z\`
8. Deploy automático desde tag

## 7. Protección del repositorio

### Reglas de protección de ramas
- [ ] Prohibir push directo a \`${mainBranch}\`
- [ ] Requerir PR para merge
- [ ] Requerir al menos 1 aprobación
- [ ] Requerir CI verde antes de merge
- [ ] Prohibir force push
- [ ] Requerir branch actualizado antes de merge

### Secretos y variables
- [ ] Secretos almacenados en settings del repositorio (no en código)
- [ ] Variables de entorno por ambiente (dev, staging, prod)
- [ ] Rotación de secretos documentada

## 8. Archivos del repositorio

| Archivo | Propósito | Requerido |
|---|---|---|
| \`README.md\` | Documentación principal | Sí |
| \`LICENSE\` | Licencia del proyecto | Sí |
| \`.gitignore\` | Archivos excluidos de Git | Sí |
| \`CHANGELOG.md\` | Historial de cambios | Sí |
| \`CONTRIBUTING.md\` | Guía de contribuciones | Recomendado |
| \`CODE_OF_CONDUCT.md\` | Código de conducta | Recomendado |
| \`SECURITY.md\` | Política de reporte de vulnerabilidades | Recomendado |
| \`.github/CODEOWNERS\` | Propietarios de código | Recomendado |

---
*Actualizar ante cambios en el workflow de desarrollo o políticas del repositorio.*
`
}

function generateUserDataManagement(config: DevSentinelConfig): string {
  return `${header('User Data Management', config.project)}

## 1. Principios de manejo de datos

- **Minimización:** Solo recopilar datos estrictamente necesarios
- **Finalidad:** Cada dato tiene un propósito documentado
- **Consentimiento:** Todo procesamiento requiere base legal
- **Transparencia:** El usuario sabe qué datos se recopilan y por qué
- **Seguridad:** Datos cifrados en tránsito y en reposo
- **Retención limitada:** Los datos se eliminan cuando ya no son necesarios

## 2. Inventario de datos personales

### Datos recopilados

| Dato | Categoría | Finalidad | Base legal | Retención | Cifrado |
|---|---|---|---|---|---|
| Email | Identificación | Autenticación, comunicación | Consentimiento | Mientras cuenta activa | Sí |
| Nombre | Identificación | Personalización | Consentimiento | Mientras cuenta activa | Sí |
| Password (hash) | Seguridad | Autenticación | Interés legítimo | Mientras cuenta activa | bcrypt/argon2 |
| IP address | Técnico | Seguridad, logs | Interés legítimo | 90 días | No |
| User agent | Técnico | Compatibilidad | Interés legítimo | 90 días | No |

### Datos NO recopilados (prohibidos)
- Datos biométricos
- Datos de salud
- Orientación sexual o creencias religiosas
- Datos financieros completos (solo tokens de pago)
- Geolocalización precisa (sin consentimiento explícito)

## 3. Flujo de vida del dato

\`\`\`
Recopilación → Validación → Cifrado → Almacenamiento → Uso → Retención → Eliminación
     ↓              ↓           ↓            ↓           ↓         ↓           ↓
 Consentimiento  Sanitización  AES-256    DB cifrada   Finalidad  TTL      Borrado
                                                       específica check    completo
\`\`\`

## 4. Consentimiento y preferencias

### Mecanismo de consentimiento
- [ ] Formulario de registro con checkboxes granulares
- [ ] No pre-marcar ninguna opción
- [ ] Registro de consentimiento: timestamp + versión + IP
- [ ] Panel de preferencias accesible post-registro
- [ ] Opción de retirar consentimiento en cualquier momento

### Categorías de consentimiento
| Categoría | Requerido | Revocable | Default |
|---|---|---|---|
| Datos esenciales del servicio | Sí | Con cierre de cuenta | Activo |
| Comunicaciones por email | No | Sí | Inactivo |
| Analíticas de uso | No | Sí | Inactivo |
| Datos compartidos con terceros | No | Sí | Inactivo |

## 5. Almacenamiento y cifrado

| Tipo de dato | Almacenamiento | Cifrado en reposo | Cifrado en tránsito |
|---|---|---|---|
| Credenciales | DB principal | bcrypt/argon2 (hash) | TLS 1.3 |
| Datos personales | DB principal | AES-256 | TLS 1.3 |
| Tokens de sesión | Cache/Redis | Sí | TLS 1.3 |
| Archivos del usuario | Object storage | AES-256 | TLS 1.3 |
| Logs con datos personales | Log storage | Sí | TLS 1.3 |

### Claves de cifrado
- [ ] Rotación de claves cada _N_ meses
- [ ] Claves almacenadas en vault/KMS (no en código)
- [ ] Separación de claves por ambiente (dev/staging/prod)

## 6. Retención y eliminación

### Política de retención

| Tipo de dato | Retención | Acción al expirar |
|---|---|---|
| Datos de cuenta activa | Mientras cuenta activa | N/A |
| Datos de cuenta eliminada | 30 días (gracia) | Borrado permanente |
| Logs de acceso | 90 días | Eliminación automática |
| Logs de auditoría | 1 año | Archivado y luego eliminación |
| Backups con datos personales | _N_ días | Rotación automática |
| Datos de análisis (anonimizados) | Indefinido | N/A (datos no personales) |

### Proceso de eliminación de cuenta

1. Usuario solicita eliminación
2. Confirmación por email
3. Período de gracia de 30 días (reactivable)
4. Eliminación de todos los datos personales de todas las tablas
5. Eliminación de archivos asociados
6. Anonimización de datos en logs de auditoría
7. Confirmación de eliminación al usuario
8. Registro de la operación en log de compliance

### Implementación técnica
\`\`\`sql
-- Pseudocódigo del proceso de eliminación
BEGIN TRANSACTION;
  DELETE FROM user_preferences WHERE user_id = ?;
  DELETE FROM user_sessions WHERE user_id = ?;
  DELETE FROM user_files WHERE user_id = ?;
  UPDATE audit_logs SET user_id = 'DELETED', user_email = 'DELETED'
    WHERE user_id = ?;
  DELETE FROM users WHERE id = ?;
COMMIT;
\`\`\`

## 7. Acceso y portabilidad

### Endpoint de exportación de datos
- Formato: JSON + CSV
- Contenido: todos los datos personales del usuario
- Plazo: máximo 30 días desde la solicitud
- Autenticación: requiere verificación de identidad

### Datos incluidos en la exportación
- Datos de perfil
- Historial de actividad
- Preferencias y configuraciones
- Archivos creados por el usuario
- Historial de consentimientos

## 8. Terceros y transferencias

| Tercero | Datos compartidos | Finalidad | Ubicación | Garantías |
|---|---|---|---|---|
| _Servicio 1_ | _Datos_ | _Propósito_ | _País_ | _Cláusulas contractuales_ |

### Requisitos para compartir datos con terceros
- [ ] Contrato de procesamiento de datos (DPA) firmado
- [ ] Cláusulas contractuales estándar (si transferencia internacional)
- [ ] Consentimiento explícito del usuario
- [ ] Evaluación de impacto (DPIA) completada
- [ ] Registro en el inventario de transferencias

## 9. Incidentes de seguridad de datos

### Proceso de notificación (RGPD Art. 33-34)
1. Detectar y contener la brecha (máximo 72h para notificar)
2. Evaluar riesgo para los interesados
3. Notificar a la autoridad de control (AEPD/equivalente)
4. Notificar a los usuarios afectados si riesgo alto
5. Documentar el incidente y las medidas tomadas
6. Implementar medidas correctivas

---
*Este documento es obligatorio para cumplimiento normativo. Revisar trimestralmente.*
`
}

function generateDatabaseManagement(config: DevSentinelConfig): string {
  return `${header('Database Management', config.project)}

## 1. Estrategia de base de datos

| Aspecto | Valor |
|---|---|
| Motor principal | _Definir: PostgreSQL / MySQL / SQLite / etc._ |
| ORM / Query builder | _Definir: Prisma / TypeORM / Drizzle / etc._ |
| Estrategia de migraciones | _Definir: automática / manual / versionada_ |
| Ambiente de desarrollo | _Local / Docker / Cloud_ |

## 2. Ambientes

| Ambiente | Motor | Host | Acceso | Backup |
|---|---|---|---|---|
| Development | _Motor_ | localhost | Libre | No |
| Staging | _Motor_ | _Host_ | Restringido | Semanal |
| Production | _Motor_ | _Host_ | Solo CI/CD + DBA | Diario |

## 3. Schema y migraciones

### Política de migraciones
- Toda modificación de schema debe hacerse mediante migración versionada
- Las migraciones deben ser reversibles (up + down)
- No ejecutar migraciones destructivas sin backup previo
- Toda migración requiere review antes de aplicar en producción
- Probar migraciones en staging antes de producción

### Registro de migraciones

| Versión | Descripción | Fecha | Autor | Reversible | Aplicada en prod |
|---|---|---|---|---|---|
| V001 | Schema inicial | _Fecha_ | _Autor_ | Sí | _Sí/No_ |

### Operaciones prohibidas sin aprobación
- \`DROP TABLE\`
- \`DROP DATABASE\`
- \`TRUNCATE TABLE\`
- \`ALTER TABLE ... DROP COLUMN\`
- Cambiar tipo de dato de columna con datos existentes
- Eliminar índices en producción
- Modificar constraints de FK

## 4. Backups y recuperación

### Estrategia de backup

| Tipo | Frecuencia | Retención | Almacenamiento | Cifrado |
|---|---|---|---|---|
| Full backup | Diario | 30 días | _Ubicación_ | AES-256 |
| Incremental | Cada 6h | 7 días | _Ubicación_ | AES-256 |
| Transaction log | Continuo | 72h | _Ubicación_ | AES-256 |
| Pre-migración | Antes de cada migración | 90 días | _Ubicación_ | AES-256 |

### Plan de recuperación (DR)

| Escenario | RTO | RPO | Procedimiento |
|---|---|---|---|
| Corrupción de datos | _tiempo_ | _pérdida aceptable_ | Restore desde backup |
| Fallo de servidor | _tiempo_ | _pérdida aceptable_ | Failover a réplica |
| Migración fallida | _tiempo_ | 0 | Rollback de migración |
| Eliminación accidental | _tiempo_ | _pérdida aceptable_ | Restore selectivo |

### Procedimiento de restauración
1. Identificar el punto de recuperación
2. Verificar integridad del backup
3. Restaurar en ambiente aislado primero
4. Validar datos restaurados
5. Aplicar en producción (si corresponde)
6. Documentar el incidente

## 5. Rendimiento

### Índices

| Tabla | Columna(s) | Tipo | Justificación |
|---|---|---|---|
| _tabla_ | _columna_ | _B-Tree/Hash/GIN_ | _Razón_ |

### Monitoreo
- [ ] Query slow log activado (> _N_ ms)
- [ ] Monitoreo de conexiones activas
- [ ] Alertas por espacio en disco
- [ ] Métricas de latencia de queries
- [ ] Análisis periódico de queries lentas

### Límites
| Parámetro | Valor | Justificación |
|---|---|---|
| Max connections | _N_ | _Razón_ |
| Query timeout | _N_ ms | _Razón_ |
| Max result set | _N_ rows | _Razón_ |
| Connection pool size | _N_ | _Razón_ |

## 6. Seguridad de datos

### Cifrado
- [ ] Cifrado en reposo (TDE o a nivel de aplicación)
- [ ] Cifrado en tránsito (TLS para conexiones)
- [ ] Cifrado de campos sensibles a nivel de aplicación
- [ ] Claves de cifrado en vault/KMS

### Control de acceso
| Rol | Permisos | Ambiente |
|---|---|---|
| App (read-write) | SELECT, INSERT, UPDATE, DELETE | Producción |
| App (read-only) | SELECT | Réplica de lectura |
| DBA | ALL | Con auditoría |
| Migrations | DDL + DML | Solo durante deploys |

### Auditoría
- [ ] Log de todas las operaciones DDL
- [ ] Log de accesos a datos sensibles
- [ ] Alertas por accesos inusuales
- [ ] Revisión trimestral de permisos

## 7. Integridad de datos

### Constraints
- Toda tabla debe tener PRIMARY KEY
- Relaciones con FOREIGN KEY + ON DELETE definido
- NOT NULL donde el negocio lo requiera
- UNIQUE donde corresponda
- CHECK constraints para rangos válidos

### Validación
- Validar en la aplicación Y en la base de datos
- No confiar solo en validación del frontend
- Sanitizar datos antes de insertar

---
*Toda operación destructiva en la base de datos requiere aprobación. DevSentinel monitorea estos cambios.*
`
}

function generateInstallUninstall(config: DevSentinelConfig): string {
  return `${header('Installation & Uninstallation', config.project)}

## 1. Requisitos del sistema

| Requisito | Mínimo | Recomendado |
|---|---|---|
| Sistema operativo | _OS mínimo_ | _OS recomendado_ |
| RAM | _N_ GB | _N_ GB |
| Espacio en disco | _N_ GB | _N_ GB |
| Runtime | _Ej: Node.js >= 20_ | _Versión_ |
| Conectividad | _Requerida/Opcional_ | — |

## 2. Proceso de instalación

### Método 1: _Package manager_
\`\`\`bash
# Instalar desde registry
npm install -g ${config.project.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

### Método 2: _Desde código fuente_
\`\`\`bash
git clone [URL_REPOSITORIO]
cd ${config.project.toLowerCase().replace(/\s+/g, '-')}
npm install
npm run build
\`\`\`

### Método 3: _Instalador (desktop)_
- Windows: \`setup.exe\` / \`.msi\`
- macOS: \`.dmg\`
- Linux: \`.deb\` / \`.rpm\` / \`.AppImage\`

### Post-instalación
1. Verificar instalación: \`${config.project.toLowerCase().replace(/\s+/g, '-')} --version\`
2. Ejecutar configuración inicial
3. Verificar permisos requeridos

## 3. Datos creados durante la instalación

| Ubicación | Contenido | Tamaño estimado |
|---|---|---|
| _~/.config/app/_ | Configuración del usuario | < 1 MB |
| _~/.local/share/app/_ | Datos locales, cache | Variable |
| _Directorio del proyecto_ | \`.devsentinel/\` | < 10 MB |
| _Sistema_ | Binarios, dependencias | _N_ MB |

## 4. Proceso de desinstalación

### Principios
- **Limpieza completa:** No dejar archivos residuales sin informar al usuario
- **Preservación de datos:** Preguntar al usuario qué datos conservar
- **Reversibilidad:** Ofrecer backup antes de desinstalar
- **Transparencia:** Listar todos los archivos y directorios que se eliminarán

### Desinstalación estándar
\`\`\`bash
# Desinstalar la aplicación
npm uninstall -g ${config.project.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

### Desinstalación completa (con limpieza de datos)
\`\`\`bash
# 1. Backup de datos del usuario (opcional)
${config.project.toLowerCase().replace(/\s+/g, '-')} export --all --output backup.zip

# 2. Eliminar datos de configuración
${config.project.toLowerCase().replace(/\s+/g, '-')} cleanup --all

# 3. Desinstalar la aplicación
npm uninstall -g ${config.project.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

### Datos que se eliminan

| Dato | Se elimina en desinstalación estándar | Se elimina en limpieza completa |
|---|---|---|
| Binarios de la aplicación | Sí | Sí |
| Configuración del usuario | No | Sí (con confirmación) |
| Datos de proyectos (.devsentinel/) | No | Sí (con confirmación) |
| Base de datos local | No | Sí (con confirmación) |
| Cache | No | Sí |
| Logs | No | Sí |

### Datos que NUNCA se eliminan automáticamente
- Código fuente del usuario
- Archivos del proyecto no creados por la herramienta
- Commits y ramas de Git
- Datos en servicios externos

### Confirmaciones requeridas
- [ ] Mostrar lista de directorios a eliminar antes de proceder
- [ ] Solicitar confirmación explícita (\`--yes\` para modo no interactivo)
- [ ] Ofrecer crear backup antes de eliminar
- [ ] Registrar la desinstalación en log (si existe)

## 5. Migración entre versiones

### Upgrade
\`\`\`bash
# Actualizar a la última versión
npm update -g ${config.project.toLowerCase().replace(/\s+/g, '-')}

# Migrar datos de configuración
${config.project.toLowerCase().replace(/\s+/g, '-')} migrate
\`\`\`

### Downgrade
\`\`\`bash
# Instalar versión específica
npm install -g ${config.project.toLowerCase().replace(/\s+/g, '-')}@[version]

# Revertir migración de datos
${config.project.toLowerCase().replace(/\s+/g, '-')} migrate --revert
\`\`\`

## 6. Normativas aplicables

| Normativa | Requisito | Implementación |
|---|---|---|
| RGPD Art. 17 | Derecho al olvido | Eliminar todos los datos del usuario al desinstalar (si se solicita) |
| RGPD Art. 20 | Portabilidad | Exportación de datos antes de desinstalar |
| Directiva 2011/83/UE | Información clara de desinstalación | Documentación accesible |
| Apple App Store Guidelines | Desinstalación limpia | No dejar archivos ocultos |
| Google Play Policies | Transparencia de datos | Listar datos almacenados |

---
*El proceso de desinstalación debe ser tan sencillo como el de instalación.*
`
}

function generateUpdatesMaintenance(config: DevSentinelConfig): string {
  return `${header('Updates & Maintenance', config.project)}

## 1. Estrategia de versionado

### Semantic Versioning 2.0.0
\`\`\`
MAJOR.MINOR.PATCH

MAJOR: breaking changes (API incompatible)
MINOR: nueva funcionalidad (backward-compatible)
PATCH: corrección de bugs (backward-compatible)
\`\`\`

### Canales de actualización
| Canal | Estabilidad | Frecuencia | Público |
|---|---|---|---|
| Stable | Producción | Mensual / Bajo demanda | Todos |
| Beta | Pre-release | Semanal | Opt-in |
| Nightly | Desarrollo | Diario | Desarrolladores |

## 2. Proceso de actualización

### Actualizaciones automáticas
| Aspecto | Política |
|---|---|
| Habilitadas por defecto | _Sí/No_ |
| Solo parches de seguridad | _Sí/No_ |
| Requiere consentimiento | Sí |
| Se puede desactivar | Sí |
| Notificación previa | Sí |

### Flujo de actualización
1. Notificar al usuario que hay actualización disponible
2. Mostrar changelog de la nueva versión
3. Solicitar confirmación (excepto parches de seguridad críticos)
4. Crear backup automático de la configuración
5. Descargar nueva versión
6. Verificar integridad (checksum/firma)
7. Aplicar actualización
8. Ejecutar migraciones de datos si aplica
9. Verificar que todo funciona correctamente
10. Notificar resultado al usuario

### Rollback de actualización
\`\`\`bash
# Revertir a la versión anterior
${config.project.toLowerCase().replace(/\s+/g, '-')} update --rollback

# Instalar versión específica
${config.project.toLowerCase().replace(/\s+/g, '-')} update --version X.Y.Z
\`\`\`

## 3. Compatibilidad

### Matriz de compatibilidad
| Versión App | Runtime mínimo | OS soportados | DB compatible |
|---|---|---|---|
| _vX.Y_ | _Runtime_ | _Windows/macOS/Linux_ | _Versiones_ |

### Breaking changes
| De versión | A versión | Cambio | Migración |
|---|---|---|---|
| _vX.Y_ | _vX+1.0_ | _Descripción_ | _Automática/Manual_ |

### Política de deprecación
1. Anunciar deprecación con al menos 1 versión MINOR de anticipación
2. Marcar como deprecated en código y documentación
3. Mantener funcionalidad deprecated durante al menos 1 ciclo de release
4. Eliminar en la siguiente versión MAJOR
5. Documentar migración para cada funcionalidad deprecada

## 4. Migración de datos

### Principios
- Las migraciones de datos deben ser automáticas y reversibles
- Crear backup antes de cualquier migración
- Migrar en ambiente de staging antes de producción
- Toda migración debe tener test de ida y vuelta

### Registro de migraciones de configuración

| De versión | A versión | Migración | Automática | Reversible |
|---|---|---|---|---|
| _vX.Y_ | _vX.Z_ | _Descripción_ | _Sí/No_ | _Sí/No_ |

## 5. Mantenimiento

### Ventanas de mantenimiento
| Tipo | Frecuencia | Duración | Notificación previa |
|---|---|---|---|
| Mantenimiento programado | _Frecuencia_ | _Duración_ | 48h |
| Parche de seguridad | Según necesidad | Mínima | ASAP |
| Actualización mayor | _Frecuencia_ | _Duración_ | 1 semana |

### Tareas de mantenimiento periódicas
| Tarea | Frecuencia | Responsable | Automatizada |
|---|---|---|---|
| Actualizar dependencias | Semanal | _Equipo_ | Parcialmente (Dependabot) |
| Auditoría de seguridad | Mensual | _Equipo_ | \`npm audit\` |
| Limpieza de logs | Semanal | Sistema | Sí |
| Rotación de backups | Diario | Sistema | Sí |
| Revisión de rendimiento | Mensual | _Equipo_ | No |
| Auditoría de licencias | Por release | _Equipo_ | Parcialmente |

## 6. Comunicación de actualizaciones

### Canales de comunicación
| Canal | Contenido | Público |
|---|---|---|
| In-app notification | Disponibilidad de actualización | Todos |
| Email | Breaking changes y seguridad | Usuarios registrados |
| Changelog | Detalle completo de cambios | Público |
| Blog/Docs | Guías de migración | Público |

### Contenido de la notificación
- Versión actual vs. nueva versión
- Resumen de cambios (máximo 3 líneas)
- Si hay breaking changes: destacar prominentemente
- Link al changelog completo
- Acción clara: "Actualizar ahora" / "Más información"

## 7. End of Life (EOL)

### Política de soporte por versión
| Tipo de release | Soporte activo | Soporte de seguridad | EOL |
|---|---|---|---|
| Major release | 12 meses | 18 meses | Tras 18 meses |
| LTS release | 24 meses | 36 meses | Tras 36 meses |

### Proceso de EOL
1. Anunciar EOL con 6 meses de anticipación
2. Publicar guía de migración a versión soportada
3. Mantener parches de seguridad críticos durante el período de transición
4. Desactivar actualizaciones automáticas de la versión EOL
5. Archivar documentación de la versión

## 8. Normativas aplicables

| Normativa | Requisito | Cómo se cumple |
|---|---|---|
| RGPD Art. 25 | Privacy by design en actualizaciones | Review de privacidad en cada release |
| RGPD Art. 32 | Seguridad actualizada | Parches de seguridad oportunos |
| ISO 27001 A.12.6 | Gestión de vulnerabilidades técnicas | Proceso de actualización documentado |
| ISO 27001 A.14.2 | Seguridad en desarrollo y soporte | CI/CD con checks de seguridad |

---
*Toda actualización sigue este proceso. Las excepciones requieren documentación y aprobación.*
`
}
