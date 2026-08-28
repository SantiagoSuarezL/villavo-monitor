# Tech Stack — villavo-monitor

> Se completa la primera vez durante el bootstrap (ver BOOTSTRAP.md),
> leyendo ARCHITECTURE.md/TECHNICAL_SPEC.md UNA vez. Después de eso, este
> archivo se actualiza SOLO si un cambio de stack/arquitectura es inamovible
> (ver PROTOCOLO_SALIDA.md §1) — no en cada sesión.

## Stack Actual

**Lenguaje:** TypeScript ^5.9.3 (strict `true`, `jsx: preserve`, `moduleResolution: bundler`, `esModuleInterop: true`, `noEmit: true`, plugin `next`, alias `@/*: ./src/*` — `tsconfig.json:2-26`, ESM `type: module` en ambos workspaces)

**Dependencias principales:**
- Next.js 15.2.0 (App Router) + React 19.0.0 / ReactDOM 19.0.0 (`package.json:21-23`)
- Tailwind CSS v4.3.0 + `@tailwindcss/postcss` (`postcss.config.mjs:3`)
- Data fetching: SWR v2.4.1 (provider `swr-provider.tsx`, `refreshInterval: 300_000` tabla `data-table.tsx:83` / `60_000` chip `update-chip.tsx:33`)
- Charts: recharts v3.8.1 (`history-chart.tsx` LineChart + CustomDot, solo con `q` activo)
- Fechas: date-fns v4.3.0 + helpers determinísticos `MESES_ES` en `src/lib/estados.ts` (formatFechaCorta/formatMesAnio/formatFechaNumerica)
- Fuentes: Inter (sans) + JetBrains Mono (mono) vía `next/font/google` (`layout.tsx:2-5`, `@theme --font-mono`)
- DB: `@libsql/client` ^0.14.0 — Turso/libsql (singleton `src/lib/db.ts:5`, per-call `scraper/db.ts:8`)
- Scraper: Playwright ^1.60.0, unpdf ^1.6.2, axios ^1.16.1, dotenv ^17.4.2, tsx ^4.22.3 / ts-node 10.x (`scraper/package.json:9-21`)
- Package manager: pnpm ^11.2.2 workspaces (`pnpm-workspace.yaml:1-3` — `"."` + `"scraper"`, `allowBuilds: esbuild, sharp`)

**Arquitectura:**
```
villavo-monitor/
├── scraper/                         # Pipeline EAAV PDFs → Turso
│   ├── index.ts                     # Entry: scrapeAllReportsThisMonth (L49), main (L139), 2 fases extract paralelo + DB secuencial
│   ├── parser.ts                    # EstadoServicio (L3), encodingMap (L23), normalizeEncoding (L43), parseSectores (L154)
│   ├── db.ts                        # upsertSector (L23), upsertBarrio (L69), insertReporte UPSERT (L92), cleanOldData 90d (L140)
│   └── migrate.ts                   # DDL IF NOT EXISTS + dedup MIN(id) + idx_reporte_unico (L14-91)
├── src/                             # Frontend Next.js 15 App Router
│   ├── app/
│   │   ├── page.tsx                 # Home server component (L57), getReportes 30d (L11), dynamic force-dynamic (L55), shell 6px/1600px + header blur
│   │   ├── layout.tsx               # Inter + JetBrains Mono (next/font), metadata sin favicon.ico
│   │   ├── icon.svg                 # Favicon vectorial (campo oscuro + gota papel + pulso terracota)
│   │   └── api/
│   │       ├── reports/route.ts     # GET /api/reports?q&sector_id (L4, EXISTS LIKE, GROUP_CONCAT)
│   │       ├── sectores/route.ts    # GET /api/sectores (L4)
│   │       └── summary/route.ts     # GET /api/summary (L4, agregación MAX fecha)
│   ├── components/
│   │   ├── data-table.tsx           # Tabla desktop + cards móvil clicables → modal detalle, SWR sector+q, dropdown último día (MAX fecha), hora CO
│   │   ├── search-bar.tsx           # Debounce 300ms → ?q= + botón ✕ + spinner isPending
│   │   ├── sectores-filter.tsx      # Usa navigate() suave (NavPendingProvider) en vez de hard reload
│   │   ├── summary-cards.tsx        # Marcadores 01-04 mono + L-brackets
│   │   ├── update-chip.tsx          # Live dot pulsante + fecha determinística
│   │   ├── history-chart.tsx        # recharts LineChart+CustomDot (solo q), fechas determinísticas
│   │   ├── estado-glossary.tsx      # Glosario modal accesible + botón "¿Qué significan?"
│   │   ├── reporte-detail.tsx       # Modal detalle sector/barrios grid + link a glosario
│   │   ├── modal.tsx                # Base accesible (ESC/backdrop/foco/anim)
│   │   ├── nav-pending.tsx          # useTransition + PendingOverlay (spinner+blur)
│   │   ├── reveal.tsx, corner-squares.tsx, swr-provider.tsx
│   │   └── lib/
│   │       ├── estados.ts           # ESTADOS fuente única + helpers fecha MESES_ES
│   │       ├── reporte.ts           # Reporte + extractTime UTC→CO
│   │       └── db.ts                # getDbClient singleton (L5) con validación ENV (L10)
├── .github/workflows/scraper.yml    # Cron 0 13,19 * * * (8AM/2PM CO) + workflow_dispatch
├── docs/                            # README, PRD, ARCHITECTURE, TECHNICAL_SPEC, ENGINEERING_PRINCIPLES, IMPLEMENTATION_PLAN
├── .agent/memory(-archive)/         # Memoria activa + archivo histórico
├── package.json / scraper/package.json / tsconfig.json / next.config.ts / postcss.config.mjs
└── .env / .env.example (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)
```
Community map graphify (14872 nodes): `Frontend Pages & Components`, `EAAV PDF Scraper`, `API Routes & DB Layer`, `History Chart`, `Summary Cards`, `Estado Glossary & Detail Modals`; god nodes `Home Page:25`, `getDbClient:12`, `main():13`.

**Configuración tooling:** pnpm only (`pnpm install`), TypeScript strict + plugin `next`, ESLint via `next lint`, Tailwind v4 sin `tailwind.config.js` (usa `@tailwindcss/postcss`), formatter implícito, ESM. Node >=20 (CI Node 24 `scraper.yml:21`).

**Suite de tests:** sin suite aún — Hito 6 pendiente (ver `roadmap.md`). Pendiente `vitest` para `parser.ts` + API tests. Actual: verificación via `pnpm tsc --noEmit` y `curl /api/*` manuales.

---

## Protocolos Críticos (Inamovibles)

> Protocolos Críticos solo para invariantes que costó aprender — no transcribir
> el spec. Regla corta y prescriptiva acá. La historia completa (bug, root
> cause, código) vive en `lessons_learned.md` o `lessons_learned_archive.md` —
> referenciada por número `(Ref: X.Y)`, nunca repetida palabra por palabra.

1. **SSL bypass solo para stage** — Usa `https.Agent({ rejectUnauthorized: false })` en `scraper/index.ts:116` únicamente para `stage.eaav.gov.co`; `www.eaav.gov.co` no lo requiere. No promover a prod sin verificar cert. (Ref: 6.1)
2. **Chromium sys deps** — `playwright install chromium --with-deps` en CI; local `sudo apt install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2` + verificar `ldd` antes de debuggear código si Playwright no inicia. (Ref: 6)
3. **TypeScript en workspace root** — Next 15.2 requiere `typescript` en root (`pnpm add -D typescript -w`) o `next build` se cuelga en `Checking validity of types` sin error. (Ref: 7)
4. **Dedup antes de índice único** — Antes de `CREATE UNIQUE INDEX idx_reporte_unico(sector_id,fecha)` limpia duplicados: `DELETE reporte_barrios WHERE reporte_id NOT IN (SELECT MIN(id) GROUP BY sector_id,fecha)` → `DELETE reportes_diarios WHERE id NOT IN (...)` (`migrate.ts:79-83`). (Ref: 8)
5. **Extract paralelo, DB secuencial con FKs** — En Turso/libsql nunca paralelices operaciones DB con FKs cruzadas (`reportes_diarios`↔`reporte_barrios`); separa `Promise.all` para `extractText/parse` y `for` secuencial para `upsert/insert` (`scraper/index.ts:154-161`). (Ref: 9)
6. **Identity mappings excluidos de remaining** — En `normalizeEncoding` filtra `Object.keys(encodingMap).filter(k=>map[k]!==k)` (`parser.ts:49`) antes de contar corruptos; `'º':'º'` no cuenta. (Ref: 5)
7. **Fuente única estados + recharts** — `ESTADOS` en `src/lib/estados.ts` es la única fuente para label/level/color/badge/dot/description; `history-chart.tsx` y `data-table.tsx` no redefinen; CustomDot usa `color` de ahí. Solo renderiza chart si `q` no vacío. (Ref: 9.1, 10)
8. **Fechas determinísticas (hydration-safe)** — Usa `formatFechaCorta/formatMesAnio/formatFechaNumerica` con `MESES_ES` en `lib/estados.ts`; nunca uses `toLocaleDateString` en componentes SSR. (Ref: 10)
9. **Hora monitoreo UTC→CO** — `extractTime` en `lib/reporte.ts` parsea `CURRENT_TIMESTAMP` UTC (`YYYY-MM-DD HH:mm:ss` con `T` o espacio), valida con `/^\d{2}:\d{2}/`, convierte a hora Colombia con `(h-5+24)%24` y retorna `—` si falta. (Ref: 11)
