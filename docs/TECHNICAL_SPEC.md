# TECHNICAL_SPEC — Villavo Monitor

> Contratos y comportamiento técnico. Fuente de verdad: código en `src/app/api/*`, `src/lib/db.ts`, `scraper/*`, `src/components/*`. Ver también `ARCHITECTURE.md` y `PRD.md`.

## 1. Stack y tooling (contrato)

- **Package manager**: pnpm only (`pnpm install`, nunca npm). Workspaces `pnpm-workspace.yaml:1-3`, `allowBuilds: esbuild, sharp`.
- **TypeScript**: strict `true` (`tsconfig.json:7`), `noEmit:true`, `moduleResolution: bundler`, `jsx: preserve`, `esModuleInterop:true`, alias `@/*: ./src/*` (`tsconfig.json:21`), plugin `next` (`tsconfig.json:16`). `typescript ^5.9.3` debe estar en workspace root (`package.json:31`) — Next 15 lo exige or build hangs (`lessons_learned.md:45-51`).
- **Lenguajes**: TypeScript ESM `type:module` ambos workspaces.

## 2. Environment variables

| Variable | Requerida | Dónde se valida | Error si falta |
|----------|-----------|-----------------|----------------|
| `TURSO_DATABASE_URL` | sí | `src/lib/db.ts:10` + `scraper/db.ts:12` | `throw Error('TURSO_DATABASE_URL environment variable is required')` |
| `TURSO_AUTH_TOKEN` | sí | `src/lib/db.ts:13` + `scraper/db.ts:16` | `throw Error('TURSO_AUTH_TOKEN ...')` |

Formato ejemplo `.env.example:1-2`: `libsql://<db>.turso.io`, token Turso. En CI vía `secrets.TURSO_*` (`scraper.yml:33`).

## 3. Database — schema y contratos

DDL idempotente `scraper/migrate.ts:14-63`:

```sql
CREATE TABLE IF NOT EXISTS sectores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre_sector TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS barrios (id PK AUTOINCREMENT, nombre_barrio TEXT NOT NULL, sector_id INTEGER FK→sectores);
CREATE TABLE IF NOT EXISTS reportes_diarios (id PK AUTOINCREMENT, sector_id INTEGER NOT NULL FK→sectores, estado TEXT NOT NULL, hora_inicio TEXT, hora_fin TEXT, fecha DATE NOT NULL, hora_monitoreo DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS reporte_barrios (id PK AUTOINCREMENT, reporte_id INTEGER NOT NULL FK→reportes_diarios, barrio_id INTEGER NOT NULL FK→barrios);
CREATE TABLE IF NOT EXISTS alias_normalizacion (id PK AUTOINCREMENT, alias_text TEXT UNIQUE NOT NULL, sector_id_referencia INTEGER NOT NULL FK→sectores);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reporte_unico ON reportes_diarios(sector_id, fecha);
```

**Invariantes**:
- `sector_id+fecha` único (UPSERT `scraper/db.ts:102-108` + dedup `migrate.ts:79-83` antes de crear índice).
- `hora_monitoreo` default `CURRENT_TIMESTAMP` (UTC).
- FKs explícitas con `AUTOINCREMENT` PK.
- `barrios.nombre_barrio` no único solo, único por `(nombre_barrio, sector_id)` lógico en `upsertBarrio` (`db.ts:72`).

**Operaciones clave** (`scraper/db.ts`):
- `upsertSector(nombre, alias?)`: SELECT si existe → inserta alias si no existe (`alias_normalizacion`), else INSERT sector + alias. Retorna `id`.
- `upsertBarrio(nombre, sectorId)`: SELECT por `(nombre, sector_id)` else INSERT.
- `insertReporte({sector_id, estado, hora_inicio?, hora_fin?, fecha})`: `INSERT ... ON CONFLICT(sector_id,fecha) DO UPDATE SET estado/hora_*` + SELECT id. Retorna `reporteId`.
- `deleteReporteBarrios(reporteId)` + `insertReporteBarrios(reporteId, barrioIds)`: borra e inserta bulk `INSERT INTO reporte_barrios VALUES (?,?,)...`.
- `getProcessedDates()`: `SELECT DISTINCT fecha WHERE fecha LIKE 'YYYY-MM%'` del mes actual (`db.ts:125-132`). Retorna `Set<string>`.
- `cleanOldData()`: `DELETE reporte_barrios WHERE reporte_id IN (SELECT id FROM reportes_diarios WHERE fecha < date('now','-90 days'))` + `DELETE reportes_diarios ...` (`db.ts:154-160`).

## 4. Scraper — contratos de parsing

### 4.1 Tipos (`scraper/parser.ts:3-21`)

```ts
type EstadoServicio = 'con_servicio' | 'baja_presion' | 'llenado_presurizacion' | 'pendiente_servicio' | 'suministro_normal' | 'con_servicio_horario';
interface SectorData { sector: string; alias: string; estado: EstadoServicio; hora_inicio?: string; hora_fin?: string; barrios: string[]; es_subsector: boolean; padre?: 'caño_grande'|'plantas_barrio'; fecha: string; }
```

### 4.2 Encoding (`parser.ts:23-64`)

- Mapa `encodingMap: Record<string,string>` L23 (ej `'Ý'→'í', '¾'→'ó', '±'→'ñ' ... 'º':'º' identity`).
- `normalizeEncoding(text)`: itera char→map, luego detecta restantes filtrando identity keys `Object.keys(...).filter(k=>map[k]!==k)` L49, log `⚠ Encoding: N restantes` o `✓ 0 restantes`.
- `extractTextFromPDF(buffer)`: `unpdf extractText(Uint8Array) → text.join('\n')`, log `✓ Texto extraído: ~N caracteres`.

### 4.3 Estado y horarios (`parser.ts:66-110`)

- `to24h("2:30 pm") → "14:30"` (regex `(\d{1,2})(?::(\d{2}))?\s*(am|pm)` L67).
- `estadoRegexes: {regex, estado, hasHours}[]` L76-92 (orden importa: rangos horario → `con_servicio` exacto → `baja_presion` → `llenado_presurizacion` → `pendiente_servicio` → `suministro_normal`).
- `parseEstado(text)` prueba en orden, si `hasHours` extrae `m[1],m[2]` → `hora_inicio/hora_fin` vía `to24h`.

### 4.4 Sectores/barrios (`parser.ts:112-227`)

- `parseHeader(line)`: split por `:` → `left:right`, `parseEstado(right)`, alias `left.match(/^(.+?)\s*\((.+)\)$/)` → `{sector, alias}`.
- `parseBarrios(text)`: split `,`, maneja ` y ` final, trim `.$` por item.
- `parseSectores(text, fecha)`: line-by-line, track `currentParent` (`Línea Caño Grande` → `caño_grande`, `Plantas en los Barrios` → `plantas_barrio`, reset en `Línea Caño Blanco`), `flushSector/flushBarrios`, `es_subsector = parent!==undef || /Montecarlo|Catumare|Amarilo/.test(sector) || estado==='suministro_normal'`, `padre: currentParent`.

### 4.5 Navegación y descarga (`scraper/index.ts:49-195`)

- `MESES` L12 map mes→MM, `MONTHS_ES` upper, `getCurrentMonthES()`, `extractDateFromFileName` regex `SUMINISTRO DEL SERVICIO (\d{2}) DE (\w+)` → `YYYY-MM-DD` (year actual), `extractDayFromFilename` para sort.
- `scrapeAllReportsThisMonth(skipDates:Set<string>)`: `chromium.launch(headless:true)` → `page.goto(eaav.gov.co, waitUntil:networkidle,30s)` → `waitForSelector a[href*=.pdf] 15s` else error DOM change → `$$eval` href/text → filter `matchesMonth && isStandardFormat` (`/SUMINISTRO DEL SERVICIO \d{2} DE /i`) → sort por día → filter `skipDates` log `⏭ Ya procesado` → loop secuencial `axios.get(href, {responseType:arraybuffer, httpsAgent:rejectUnauthorized:false})` log tamaño KB, catch 404 skip else throw.
- `main()`: `cleanOldData()` → `getProcessedDates()` log size → `scrapeAllReportsThisMonth` → si 0 `Base de datos al día` return → `Promise.all` extracción paralelo (cada PDF: fecha, extractText, normalize, parseSectores) → `for` secuencial DB (upsertSector → insertReporte → deleteBarrios → upsertBarrio loop → insertReporteBarrios) log `✓ file: N sectores, M barrios`.

## 5. APIs HTTP (Next.js Route Handlers)

Todas usan `getDbClient()` (`src/lib/db.ts:5`) y retornan `NextResponse.json`, catch → 500 `{error:...}`.

### 5.1 `GET /api/reports` (`src/app/api/reports/route.ts:4`, `src/app/page.tsx:11`)

| Query param | Tipo | Requerido | Descripción |
|-------------|------|-----------|-------------|
| `sector_id` | number (string) | no | Filtra por `rd.sector_id = ?` |
| `q` | string | no | Filtra barrios con `EXISTS (SELECT 1 FROM reporte_barrios rb2 JOIN barrios b2 ... WHERE b2.nombre_barrio LIKE %q%)` |

Comportamiento:
- `fechaDesde = now -30d` `toISOString split T0`.
- SQL: `SELECT rd.id, s.nombre_sector sector, rd.estado, hora_* , fecha, hora_monitoreo, GROUP_CONCAT(b.nombre_barrio) barrios FROM reportes_diarios rd JOIN sectores s LEFT JOIN reporte_barrios rb LEFT JOIN barrios b WHERE rd.fecha>=? [AND sector] [AND EXISTS q] GROUP BY ... ORDER BY fecha DESC, hora_monitoreo DESC`.
- Respuesta: `[{id, sector, estado, hora_inicio, hora_fin, fecha, hora_monitoreo, barrios: string[]}]` (barrios split `, `, vacío → `[]`).
- `page.tsx:getReportes` replica misma SQL pero con `Number(sectorId)` y `String(barrios).split`.

### 5.2 `GET /api/sectores` (`src/app/api/sectores/route.ts:4`)

- Sin params. SQL `SELECT id, nombre_sector FROM sectores ORDER BY nombre_sector ASC`.
- Respuesta: `[{id, nombre_sector}]`.

### 5.3 `GET /api/summary` (`src/app/api/summary/route.ts:4`)

- Sin params. Agrega sobre día más reciente:
```sql
SELECT MAX(fecha) fecha, COUNT(*) total_sectores,
 SUM(CASE WHEN estado IN ('con_servicio','suministro_normal','con_servicio_horario') THEN 1 ELSE 0 END) con_servicio,
 SUM(CASE WHEN estado='pendiente_servicio' THEN 1 ELSE 0 END) sin_servicio,
 SUM(CASE WHEN estado IN ('baja_presion','llenado_presurizacion') THEN 1 ELSE 0 END) baja_presion,
 (SELECT MAX(hora_monitoreo) FROM reportes_diarios) ultima_actualizacion
FROM reportes_diarios WHERE fecha=(SELECT MAX(fecha) FROM reportes_diarios)
```
- Respuesta: `{fecha: string|null, total_sectores: number, con_servicio: number, sin_servicio: number, baja_presion: number, ultima_actualizacion: string|null}`.

**Caché**: `export const dynamic='force-dynamic'` en `page.tsx:55` (no cache estático). SWR clientside hace revalidate.

## 6. Frontend — contratos de UI

### 6.1 Layout (`src/app/page.tsx:57-121`)

Estructura (de arriba a abajo): `[HEADER sticky bg-white border-b]` → `[Tarjetas Resumen Suspense]` → `[SearchBar + SectoresFilter flex col sm:row]` → `[HistoryChart si q]` → `[DataTable en card bg-white border shadow]`. `SWRProvider` envuelve todo. Skeletons en `Suspense fallback`.

Header: `Monitoreo en Villavo` bold `text-xl`, subtítulo `Estado del suministro...`, chip derecha `UpdateChip` Suspense.

### 6.2 Tarjetas resumen (`summary-cards.tsx`)

- Fetch SWR `/api/summary`, 4 cards grid `2 lg:4`, cada card: icono según estado, número bold grande, label gris pequeño. Valores vienen de summary.

### 6.3 Búsqueda y filtros

- `search-bar.tsx`: input ancho con icono lupa, placeholder `Buscar barrio o sector...`, debounce 300ms, actualiza URL `?q=` + `sector_id` preservado, SWR key incluye `q` (`data-table.tsx:70`).
- `sectores-filter.tsx`: dropdown sectores desde `GET /api/sectores`, valor `?sector_id=`, combina con `q`, mismo alto que input.

### 6.4 Tabla / lista (`src/components/data-table.tsx`)

Props `DataTable({reportes:initial, sectorId, q})` → `swrKey = /api/reports?sector_id&q` via `useMemo` (`data-table.tsx:70`), `useSWR(fallbackData:initial, refreshInterval:300_000, revalidateOnFocus:false)` rows = `data ?? initial`.

- **Desktop** (`hidden sm:block`): `<table>` columnas `Fecha | Sector | Estado | Barrios | Actualización`. `formatFecha` → `toLocaleDateString es-CO day numeric month short` (ej `20 may`). `extractTime` corta `hora_monitoreo` ISO `T` part → `HH:MM`. Badges `getBadgeStyles/label` según estado (`data-table.tsx:17-50`). Filas `hover:bg-gray-50`. `MAX_VISIBLE_BARRIOS=3` (`L67`) → `+N más` button expande inline (state `Set<number>` `expandedRows`), `mostrar menos` para colapsar.
- **Móvil** (`sm:hidden divide-y`): `MobileCard` por row: `[Badge][Fecha]` fila, `Sector` bold, barrios truncados + `+N más`, `Actualizado: HH:MM`.
- Orden `fecha DESC` ya viene del API.

### 6.5 Gráfico historial (`src/components/history-chart.tsx`)

- `HistoryChart({q})`: `useSWR /api/reports?q=encoded`, `ESTADO_LEVELS: {con_servicio:level3 #16a34a, suministro_normal:3, con_servicio_horario:2 #2563eb, baja_presion:1 #ca8a04, llenado:1, pendiente:0 #dc2626}` L23, `LEVEL_LABELS` L32, `CustomDot` circle r6 fill payload.color, `CustomTooltip` muestra fecha+label.
- `useMemo` dedup por `fecha-estado`, sort por fecha, `chartData` → `LineChart` `ResponsiveContainer h200`, `XAxis fechaLabel`, `YAxis domain [-0.5,3.5] ticks 0-3 label`, `Line dataKey level dot CustomDot stroke transparent`. Título `Historial de {q} — {formatMesAnio(...)}` L121. Solo render si `reportes && chartData length>0` else `null` L115.

### 6.6 Chip actualización (`src/components/update-chip.tsx`)

- `getTimeAgo(utcDateStr)` diffMs `now - date` → diffMin/hours/days. `<1min` → `🟢 hace menos de 1 min green-700 bg-green-50 border-green-200`, `<60min` → `🟢 hace N min`, `<24h` → `🟡 hace N horas yellow`, else `🔴 Sin actualizar desde localeDate red`. `UpdateChip` SWR `/api/summary` `refreshInterval:60_000` L33, `if !ultima_actualizacion return null`.

### 6.7 Paleta y estilos (`villavo-frontend.md:131-143` canónico)

```
con_servicio/suministro_normal: #16a34a text / #dcfce7 bg
pendiente_servicio: #dc2626 / #fee2e2
baja_presion/llenado_presurizacion: #ca8a04 / #fef9c3
con_servicio_horario: #2563eb / #dbeafe
Background: #f9fafb, Cards: #ffffff border #e5e7eb, Texto principal #111827, secundario #6b7280
```

Tailwind v4 via `postcss.config.mjs:3` `@tailwindcss/postcss`. Clases usan hex inline (ej `bg-[#f9fafb]`) no variables.

## 7. Validación y errores

- **APIs**: try/catch → `console.error` + `NextResponse.json({error}, {status:500})`.
- **Scraper**: `process.on(unhandledRejection)` exit 1 (`index.ts:7`), `waitForSelector` timeout → error DOM change, `monthPDFs length 0` → error mes actual, `extractDateFromFileName` fallback `new Date()` con warn, axios 404 skip, otros throw.
- **DB**: ENV throws, migration `try/catch` exit 1, dedup count antes de índice.
