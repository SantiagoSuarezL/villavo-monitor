# ARCHITECTURE — Villavo Monitor

> Cómo se estructura el sistema. Fuente: `README.md:22-50`, `scraper/*`, `src/*`, `graphify-out/GRAPH_REPORT.md` (216 nodes, 18 communities), `.agent/memory-archive/tech_stack.md`.

## 1. Visión general

Monorepo pnpm workspaces (`pnpm-workspace.yaml:1-3`):

```
villavo-monitor/
├── scraper/                         # Pipeline EAAV PDFs → Turso
│   ├── index.ts                     # Entry: navega, descarga, pipeline 2 fases (L49 scrapeAllReportsThisMonth, L139 main)
│   ├── parser.ts                    # Extracción texto, normalizeEncoding, parseSectores (L154), EstadoServicio (L3)
│   ├── db.ts                        # CRUD Turso (upsertSector L23, upsertBarrio L69, insertReporte L92 UPSERT, cleanOldData L140)
│   └── migrate.ts                   # DDL idempotente + dedup + idx_reporte_unico (L14-91)
├── src/                             # Frontend Next.js 15 App Router
│   ├── app/
│   │   ├── page.tsx                 # Server component Home (L57), getReportes (L11), dynamic force-dynamic (L55), layout por spec villavo-frontend
│   │   ├── layout.tsx               # Root layout + metadata
│   │   └── api/
│   │       ├── reports/route.ts     # GET /api/reports?q&sector_id (L4, 30d, EXISTS LIKE)
│   │       ├── sectores/route.ts    # GET /api/sectores (L4)
│   │       └── summary/route.ts     # GET /api/summary (L4, agregación día más reciente)
│   ├── components/
│   │   ├── data-table.tsx           # Tabla desktop + cards móvil, SWR key sector+q (L69), +N más (L67)
│   │   ├── search-bar.tsx           # Búsqueda barrio debounce 300ms → ?q=
│   │   ├── sectores-filter.tsx      # Dropdown sectores (SWR /api/sectores)
│   │   ├── summary-cards.tsx        # 4 cards SWR /api/summary
│   │   ├── update-chip.tsx          # Chip frescura polling 60s (L33), cálculo diff (L12)
│   │   ├── history-chart.tsx        # Recharts LineChart + CustomDot (L61), solo con q (L80)
│   │   └── swr-provider.tsx         # Provider global SWR
│   └── lib/
│       └── db.ts                    # getDbClient singleton libsql (L5), validación ENV (L10)
├── .github/workflows/scraper.yml    # Cron 0 13,19 * * * (8AM/2PM CO) + workflow_dispatch (L4-5)
├── docs/                            # Este folder canónico (6 docs)
├── graphify-out/                    # Knowledge graph (god nodes, communities)
├── .agent/memory-archive/           # Memoria canónica (tech_stack, roadmap, lessons, session_log)
├── package.json                     # Next 15, React 19, recharts 3.8.1, SWR 2.4.1, libsql, tailwind 4.3 (L17-26)
├── scraper/package.json             # Playwright 1.60, unpdf 1.6.2, axios 1.16, dotenv 17.4 (L9-21)
├── tsconfig.json                    # strict, jsx preserve, @/* alias, plugin next (L2-26)
├── next.config.ts / postcss.config.mjs # Tailwind postcss plugin
└── .env / .env.example              # TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
```

Community map (graphify): `Frontend Pages & Components` (Home, DataTable...), `EAAV PDF Scraper` (main, parser, db ops), `API Routes & DB Layer` (GET handlers ↔ getDbClient), `History Chart`, `Summary Cards`. God nodes: `Home Page:25 edges`, `getDbClient:12`, `main():13`.

## 2. Flujo de datos end-to-end

```
[EAAV SPA]  --Playwright chromium.launch-->  page.goto(.../Comunicados_Suministro_de_Agua, waitUntil:networkidle)
      --$$eval a[href*=.pdf]--> pdfLinks (href+text)
      --filter mes actual (MONTHS_ES, MESES) + isStandardFormat + sort por día--> monthPDFs
      --filter skipDates (getProcessedDates LIKE YYYY-MM%)--> pendingPDFs
      --axios.get(arraybuffer, httpsAgent rejectUnauthorized:false)--> Buffers
           |
           +-- Fase 1 (paralelo Promise.all, index.ts:154): extractTextFromPDF(unpdf) -> normalizeEncoding(encodingMap) -> parseSectores(text, fecha)
           |       parseHeader: split "Sector (Alias): Estado ..." -> parseEstado(regexes) -> to24h -> parseBarrios (split , y )
           |
           +-- Fase 2 (secuencial for, index.ts:165): upsertSector -> insertReporte(UPSERT) -> deleteReporteBarrios -> upsertBarrio* -> insertReporteBarrios
           |
      [Turso libsql] sectores/barrios/reportes_diarios/reporte_barrios/alias_normalizacion
           |
      [Next.js] getDbClient singleton (src/lib/db.ts)  <--  API routes + page.tsx:getReportes (direct DB, no fetch interno)
           |
      [Frontend] SWRProvider -> DataTable(SWR /api/reports?sector_id&q, 5min) + SectoresFilter + SearchBar(?q=) + SummaryCards(/api/summary) + UpdateChip(60s) + HistoryChart(q)
```

**Decisión crítica concurrencia**: extracción CPU-bound en paralelo OK, DB con FKs **secuencial** (`lessons_learned.md:59-64`, `index.ts:130-161`) — evita `FOREIGN KEY constraint failed` por conexiones libsql independientes.

## 3. Stack detallado (versiones en `tech_stack.md`)

- **Runtime**: Node >=20, CI Node 24 (`scraper.yml:21`), ESM `type:module`, pnpm 11.2.2.
- **Scraper**: Playwright chromium (requiere sys libs `libnspr4, libnss3, libatk...` → `playwright install --with-deps`), unpdf `extractText`, axios, dotenv.
- **DB**: Turso/libsql `@libsql/client 0.14.0`. Conexión: `src/lib/db.ts` singleton lazy, `scraper/db.ts` per-call `getDbClient()` + `db.close()` finally. Migración idempotente `CREATE TABLE IF NOT EXISTS`, dedup antes de `CREATE UNIQUE INDEX IF NOT EXISTS idx_reporte_unico(sector_id, fecha)` (`migrate.ts:72-91`).
- **Frontend**: Next.js 15 App Router (solo App Router, `dynamic='force-dynamic'` en `page.tsx:55`), React 19, Tailwind v4 (`postcss.config.mjs:3`), SWR v2 (provider + fetcher `fetch(url).then(r=>r.json())`), recharts v3 (LineChart, CustomDot, ResponsiveContainer), date-fns.
- **Infra**: GitHub Actions cron UTC `0 13,19` = CO 8AM/2PM, Vercel hosting, ENV `TURSO_*` validados con throw.

## 4. Modelo de datos (Turso)

```sql
sectores (id INTEGER PK AUTOINCREMENT, nombre_sector TEXT UNIQUE NOT NULL)
barrios (id PK AUTOINCREMENT, nombre_barrio TEXT NOT NULL, sector_id INTEGER FK→sectores)
reportes_diarios (id PK AUTOINCREMENT, sector_id INTEGER NOT NULL FK→sectores, estado TEXT NOT NULL, hora_inicio TEXT, hora_fin TEXT, fecha DATE NOT NULL, hora_monitoreo DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(sector_id, fecha) vía idx_reporte_unico)
reporte_barrios (id PK AUTOINCREMENT, reporte_id INTEGER NOT NULL FK→reportes_diarios, barrio_id INTEGER NOT NULL FK→barrios)
alias_normalizacion (id PK AUTOINCREMENT, alias_text TEXT UNIQUE NOT NULL, sector_id_referencia INTEGER NOT NULL FK→sectores)
```

Índice único `idx_reporte_unico(reportes_diarios.sector_id, fecha)` evita duplicados día/sector. Flujo UPSERT: `INSERT ... ON CONFLICT DO UPDATE SET estado/horas` (`db.ts:102`) + `deleteReporteBarrios` antes de re-insertar (`db.ts:169`).

**Retención**: `cleanOldData()` (`db.ts:140`) borra `reporte_barrios` + `reportes_diarios` con `fecha < date('now','-90 days')` al inicio de cada corrida (`index.ts:141`). `getProcessedDates()` solo mira `YYYY-MM%` del mes actual (`db.ts:122`).

## 5. Componentes y responsabilidades

| Capa | Archivo:línea | Responsabilidad |
|------|---------------|-----------------|
| Scraper orchestrator | `scraper/index.ts:49-137` | Navegación, filtro mes, skip, descarga, orden por día, 404 handling |
| Parser | `scraper/parser.ts:36-64` `43-64` `76-110` `136-227` | extractText, normalizeEncoding (encodingMap L23 + identity filter L49), estadoRegexes L76, parseHeader/Barrios/Sectores |
| DB scraper | `scraper/db.ts:23-197` | upsertSector/Barrio, insertReporte UPSERT, getProcessedDates, cleanOldData, reporte_barrios |
| Migración | `scraper/migrate.ts:14-99` | DDL, dedup `DELETE ... MIN(id) GROUP BY sector_id,fecha` L79-83, índice único L88 |
| DB frontend | `src/lib/db.ts:5` | Singleton libsql, ENV validation |
| Page server | `src/app/page.tsx:11-53` `57` | getReportes (30d, EXISTS LIKE, GROUP_CONCAT), render header sticky + cards + search/filter + chart + table |
| APIs | `src/app/api/*/route.ts:4` | reports (filtros), sectores (lista), summary (agregación MAX fecha) |
| UI | `src/components/*` | DataTable SWR key memo, DesktopTable/MobileCard, HistoryChart levels 0-3, UpdateChip diff calc |

## 6. Decisiones arquitectónicas y tradeoffs

- **Playwright vs fetch**: SPA de EAAV requiere JS rendering → Playwright necesario, pero implica chromium + sys deps (`tech_stack.md:33`).
- **Singleton vs per-call DB**: frontend reutiliza cliente (serverless-friendly), scraper cierra por operación para aislar transacciones pero fuerza secuencialidad DB.
- **30 días en API + 90 días retención**: balance historial útil vs costo Turso; `GROUP_CONCAT` para barrios evita N+1.
- **Tailwind v4 con @tailwindcss/postcss**: sin config `tailwind.config.js` clásico, usa `postcss.config.mjs`.
- **SWR polling diferenciado**: 5min tabla (datos cambian 2×/día), 60s chip (frescura percibida) — evita over-fetch.

## 7. Infra y operación

- **CI**: `scraper.yml` hace `pnpm install --filter villavo-monitor-scraper` + `playwright install chromium --with-deps` + `pnpm start` con secrets `TURSO_*`.
- **SSL**: `axios httpsAgent rejectUnauthorized:false` (`index.ts:116`) solo para `stage.eaav.gov.co`; `www.eaav.gov.co` no lo necesita — no promover bypass sin verificar cert.
- **Observabilidad**: logs `✓`/`⚠`/`✗` consistentes (`migrate.ts`, `parser.ts`, `index.ts`); `unhandledRejection` handler (`index.ts:7`).
