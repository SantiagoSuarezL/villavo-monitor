# ENGINEERING_PRINCIPLES — Villavo Monitor

> Reglas que el agente (y humano) debe respetar al modificar código. Derivado de `docs/project-rules.md`, `docs/CLAUDE.md:11-38`, `prompt.md`, `lessons_learned.md:1-64`, `tech_stack.md` Protocolos Críticos. Lectura obligatoria antes de cualquier cambio.

## 1. Reglas de Oro (inviolables)

### 1.1 Gestión de Dependencias — No instales sin consultar
- Usa **solo** dependencias listadas en el hito actual (`project-rules.md:9`, `CLAUDE.md:11`). Error histórico: instalar paquetes no autorizados genera conflictos. **Regla**: revisa `IMPLEMENTATION_PLAN.md` fase actual antes de `pnpm add`. Propone y espera confirmación.

### 1.2 Sincronización de Hitos — No avances sin confirmación
- No pasar al siguiente hito sin confirmación explícita del usuario (`CLAUDE.md:12`). Error: trabajo adelantado que se rehace. **Regla**: marca hito como pendiente hasta `✓` del usuario.

### 1.3 Verificación de Resultados — Muestra comando y espera
- Al terminar cada hito, muestra comando de verificación y espera resultado (`CLAUDE.md:13`, `project-rules.md:13`). Error: asumir éxito sin validar. **Regla**: ejecuta `pnpm tsc --noEmit`, `curl /api/summary`, etc., y analiza salida antes de cerrar hito.

### 1.4 Manejo de Errores — Describe y propone max 2 soluciones
- Si error no previsto, descríbelo + propone max 2 soluciones antes de tocar código (`CLAUDE.md:14`). Error: fixes precipitados empeoran. **Regla**: documenta error, root cause sospechado, 2 opciones, espera elección.

### 1.5 Encoding Identity Mappings (`lessons_learned.md:31-36` Ref 5)
- `'º':'º'` identity en `encodingMap` causa falsos positivos en `remaining` check. **Regla**: filtra `Object.keys(map).filter(k=>map[k]!==k)` antes de contar corruptos (`parser.ts:49`). No reintroducir identity mappings en conteo.

### 1.6 Dependencias del sistema para Playwright (`lessons_learned.md:38-44` Ref 6)
- `chromium_headless_shell` falla sin sys libs `libnspr4, libnss3, libatk...`. `pnpm playwright install chromium` no instala deps del SO; `--with-deps` requiere sudo. **Regla**: verifica `ldd` antes de debuggear código cuando Playwright no inicia; en CI usa `playwright install chromium --with-deps`, local `sudo apt install -y ...` (ver `tech_stack.md:33`).

### 1.7 TypeScript en workspace root para Next.js 15 (`lessons_learned.md:45-51` Ref 7)
- Next 15.2 se cuelga en `Checking validity of types` si `typescript` solo está en `scraper/`. **Regla**: `pnpm add -D typescript -w` en root siempre; no solo en workspaces anidados.

### 1.8 Limpieza de duplicados antes de CREATE UNIQUE INDEX (`lessons_learned.md:52-58` Ref 8)
- `CREATE UNIQUE INDEX IF NOT EXISTS` falla con `SQLITE_CONSTRAINT` si hay duplicados (dos formatos PDF/día). **Regla**: antes de índice, `DELETE reporte_barrios WHERE reporte_id NOT IN (SELECT MIN(id) GROUP BY sector_id,fecha)` luego `DELETE reportes_diarios WHERE id NOT IN (...)` (`migrate.ts:79-83`).

### 1.9 Concurrencia DB con FKs en Turso (`lessons_learned.md:59-64` Ref 9)
- `Promise.all` en operaciones DB con FK cruzadas (`reportes_diarios`↔`reporte_barrios`) desde conexiones libsql independientes → `FOREIGN KEY constraint failed`. **Regla**: nunca paralelices DB con FKs en Turso; separa extracción (`Promise.all` en `extractText/parse`) y DB secuencial (`for` loop `index.ts:154-161`).

## 2. Reglas de Desarrollo

- **pnpm exclusive**: nunca npm (`project-rules.md:11`). Usa `pnpm install`, `pnpm add -w`, `pnpm --filter`.
- **TypeScript strict**: respetar `tsconfig.json` strict, `noEmit`, `jsx:preserve`, `moduleResolution:bundler`.
- **Migraciones idempotentes**: `CREATE TABLE IF NOT EXISTS` siempre (`project-rules.md:13`, `migrate.ts:17`), `CREATE UNIQUE INDEX IF NOT EXISTS`, limpieza dedup previa.
- **ENV validation explícita**: `if (!url/token) throw Error(...)` con mensaje exacto (`src/lib/db.ts:10`, `scraper/db.ts:12`). No defaults silenciosos. Formato `✓ msg` / `✗ err` en logs de migración (`project-rules.md:15`).
- **Logs estructurados**: `✓`, `⚠`, `✗` consistentes; `unhandledRejection` handler (`index.ts:7`).

## 3. Reglas de Base de Datos

- **AUTOINCREMENT PKs** siempre (`project-rules.md:17`, `migrate.ts` todas).
- **FKs explícitas** (`FOREIGN KEY` en DDL, `project-rules.md:18`).
- **Unique constraints** donde aplique: `sectores.nombre_sector`, `alias_normalizacion.alias_text`, índice `idx_reporte_unico` (`project-rules.md:19`).
- **Defaults**: `hora_monitoreo DATETIME DEFAULT CURRENT_TIMESTAMP` (`project-rules.md:20`).
- **TEXT sin límites arbitrarios** (`project-rules.md:21`).

## 4. Reglas de Scraper

- **PDF download via Playwright** siempre (`project-rules.md:23`, `index.ts:52`), no fetch directo para SPA.
- **Texto via unpdf** (`project-rules.md:24`, `parser.ts:1`).
- **Parsing tolerante** a variaciones PDF (`project-rules.md:25`): regex ordenados, `hasHours`, alias opcional `(...)`, `y` en barrios, `Línea Caño Grande/Blanco`, `Plantas en los Barrios`.
- **Retry/404 handling**: skip 404 con log, throw otros (`index.ts:123`).
- **Logging estructurado**: `✓ / ⚠` por fase, `⏭ Ya procesado`, `✓ PDFs nuevos`.

## 5. Reglas de Frontend (Next.js 15)

- **App Router exclusive**, no `pages/` (`project-rules.md:31`, `src/app/`).
- **Tailwind CSS only** (`project-rules.md:32`, `postcss.config.mjs:3`), sin CSS modules extra sin consultar.
- **Loading/error states**: `Suspense` con skeletons (`page.tsx:84-115`), `DataTableSkeleton` (`data-table.tsx:238`).
- **Server components para data fetching** donde posible (`page.tsx:getReportes` llama DB directa, no fetch interno — evita bloqueo build `roadmap.md:34`).
- **Route groups/layouts** según Next 15 convenciones; `dynamic='force-dynamic'` en `page.tsx:55`.
- **No tocar lógica APIs** (`villavo-frontend.md:5`) sin confirmación: `/api/reports`, `/api/sectores`, `/api/summary` son contratos (ver `TECHNICAL_SPEC.md` §5). No instalar deps nuevas sin consultar (`villavo-frontend.md:5`).
- **SWR**: `SWRProvider` global, `revalidateOnFocus:false`, intervalos 5min tabla / 60s chip.

## 6. Protocolos Críticos (inamovibles, ref `tech_stack.md:31-36`)

- **SSL bypass**: `httpsAgent: new https.Agent({rejectUnauthorized:false})` en `scraper/index.ts:116` solo para `stage.eaav.gov.co` (cert inválido). No mover a prod sin verificar `www.eaav.gov.co`.
- **Chromium sys deps**: lista en `tech_stack.md:33`; en CI `install --with-deps`, local `sudo apt install -y ...`.
- **TS en root**: ver Ref 7.
- **Extract paralelo / DB secuencial**: ver Ref 9 (`index.ts:130-161`).
- **recharts**: v3 en `history-chart.tsx` con `LineChart+CustomDot`; solo render con `q`; no cambiar lib sin actualizar todos los consumidores.

## 7. Protocolo de salida (mantenimiento memoria) — de `prompt.md:8-35`

Cuando una tarea introduce cambio crítico, actualizar en orden de prioridad:

1. **`tech_stack.md`** (solo si cambió stack inamovible: nueva lib, arquitectura) — documenta ¿Qué cambió? ¿Por qué inamovible?
2. **`lessons_learned.md`** (solo si error nuevo no documentado) — formato `X.Y [Categoría]: Título` / Error / Root Cause / Solución (archivos:líneas, comando) / Regla de Oro (imperativo 2-3 líneas).
3. **`roadmap.md`** (si completó hito mayor o detectó deuda crítica) — actualiza `✓` y `Pendientes Críticos`.
4. **`session_log.md`** (mandatorio, max 5 bullets) — ¿Qué se hizo? ¿Archivos mods? ¿Líneas/notas clave? Rotación: comprime última sesión a max 200 chars y mueve a Historial Relevante; detalle completo a `session_log_archive.md` si aplica; nunca >1 sesión en detalle completo.

## 8. Uso de graphify (desde `CLAUDE.md` raíz)

- Si `graphify-out/graph.json` existe: `graphify query "<pregunta>"` para subgrafo, `graphify path "<A>" "<B>"` relaciones, `graphify explain "<concepto>"` foco.
- `graphify-out/wiki/index.md` para navegación amplia si existe, si no `graphify-out/GRAPH_REPORT.md` (216 nodes).
- Tras modificar código: `graphify update .` (AST-only, sin costo API).
