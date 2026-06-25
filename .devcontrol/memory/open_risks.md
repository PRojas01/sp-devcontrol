# SP-DevControl - Riesgos Abiertos

## Tecnicos
- Persistencia actual en JSON; SQLite real sigue pendiente.
- Todo el trabajo sin commit — riesgo alto de perdida.
- Estimacion de tokens es heuristica (chars/4), no integrada con proveedores reales.
- No hay daemon local — el watcher requiere terminal abierta.
- No hay comando `launch` — los editores se abren manualmente sin control.

## Producto
- Riesgo de sobreprometer bloqueo total del prompt o del agente.
- Controles de tipo `inject` dependen de que el agente IA obedezca las instrucciones.
- Friccion inicial para usuarios que priorizan velocidad sobre gobernanza.

## Operativos
- Base historica de sesiones aun es minima (2 sesiones).
- No hay todavia aprobacion visual interactiva en desktop app.
- Falta pipeline formal de release y empaquetado npm.
