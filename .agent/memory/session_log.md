# Session Log — villavo-monitor

> MEMORIA ACTIVA. Se lee completa al inicio de sesión.
> REGLA DE ROTACIÓN (obligatoria, no opcional): al cerrar CADA sesión nueva,
> la sesión que hoy está en "ÚLTIMA SESIÓN" se comprime a 1-3 líneas y pasa a
> "HISTORIAL RELEVANTE"; el detalle completo se mueve a `session_log_archive.md`.
> Nunca debe haber más de 1 sesión en detalle completo en este archivo.
> Si este archivo supera ~150-200 líneas, la compresión no se está
> aplicando — parar y corregir antes de seguir agregando.

---

## ÚLTIMA SESIÓN (detalle completo)

Sesión 13 — 2026-08-28 — Qwen3.8-Flash-Next via opencode (agentes paralelos max 2)

- **Fase 6 Testing completada**: `pnpm add -D vitest @vitest/coverage-v8 -w`, `vitest.config.ts` (alias `@→src`, `import.meta.dirname` — Regla 12, `include scraper/src`, env node), scripts `test`/`test:coverage`; 14 suites 253 tests (parser 58, estados 29, reporte 12, calendar 40+, db 23, api 18) Stmts 74.6% Branch 77.7%; exports en `scraper/index.ts` (`MESES/getCurrentMonthES/extractDayFromFilename/extractDateFromFileName`) + guard `VITEST`; `scraper/tsconfig.json` `skipLibCheck:true` (unpdf/@napi-rs/canvas).
- **Fase 10 features**: `opengraph-image.tsx` OG 1200×630 `ImageResponse` nodejs (query summary, fallback DB vacía, fuentes fetch jsDelivr, runtime nodejs — Regla 13); `layout.tsx` `metadataBase https://villavo-monitor.vercel.app` + `openGraph`/`twitter`; `empty-state.tsx` SVG 160×120 gota+pulso punteado terracota integrado en `data-table.tsx`; `not-found.tsx` 404 papel-técnico (CornerSquares + frame-brackets + CTA "/"); `reporte-detail.tsx` botón Compartir `navigator.share→clipboard→prompt` + toast 2s.
- **Fase 11 calendario heatmap**: `sector-calendar.tsx` reemplaza recharts LineChart (grid 7 cols lun-dom, `(firstDay+6)%7`, celdas 36×36 color `ESTADOS[color]+'18'`, peor level min, click → `useReporteDetail.open`); `lib/calendar.ts` helpers (`groupByFecha`, `getDaysInMonth`, `getFirstWeekdayMonday`, `getCalendarCells`, `getColorForLevel`, `buildSWRKey`); tests 78 nuevos; build `/` 14.9kB (antes 119kB), recharts queda sin uso.
- **Fase 12 PWA+SEO**: `manifest.ts` (name Villavo, standalone, background #faf8f3, theme #b45309, icons SVG + 192/512 PNG vía `sharp 0.35.4`); `apple-icon.tsx` 180×180 edge; `layout.tsx` `viewport.themeColor`; `robots.ts` (Allow:/ Disallow:/api/ + sitemap); `sitemap.ts` `revalidate 3600` + dinámicas `?sector_id` via getDbClient try/catch.
- **Verificación**: `pnpm test` 14/253 OK, `pnpm tsc --noEmit` root+scraper OK, `pnpm next build` OK (`ƒ /opengraph-image`, `ƒ /apple-icon`, `○ /manifest.webmanifest`, `○ /robots.txt`, `○ /sitemap.xml`), `graphify update .` 489 nodes, `git push` 794bc9a..6b72fc6 (2 commits docs+feat dashboard). Pendiente: commits Etapas A-D (NO commit aún — user pidió esperar).

---

## HISTORIAL RELEVANTE (comprimido, detalle completo en session_log_archive.md)

- Sesión 12 — Rediseño Fase 9 + glosario + 5 fixes + búsqueda suave/detalle; fechas determinísticas (Ref 10-11); `pnpm tsc/build` OK x4. (2026-08-27)
- Sesión 11 — Bootstrap memoria real: poblado 9 archivos `.agent/memory/` desde `memory-archive` + `docs/` (Fase 0→6, 9 Reglas de Oro), `pnpm tsc --noEmit` OK. (2026-08-27)
- Sesión 10 — Reorg docs/ 6 canónicos: `docs/README/PRD/ARCH/TECH_SPEC/ENGINEERING/IMPLEMENTATION_PLAN` creados, `memory-archive` tech_stack/roadmap/session_log actualizados, 5 viejos eliminados, `pnpm tsc --noEmit` OK. (2026-08-27)
- Sesión 9 — Rediseño frontend: `/api/summary` + header sticky + 4 cards + recharts `history-chart` + tabla responsive + `update-chip` 60s; dep `recharts` v3. (Hito 7)
- Sesión 8 — Refactor migrate: separado `migrate.ts` de `db.ts` sin side effects. (pre-Hito 7)
- Sesión 7 — Optimización: `getProcessedDates` filtrado `YYYY-MM%` + `cleanOldData` 90d (`db.ts:122,140`). (Hito 6 parcial)
- Sesión 6 — Multi-PDF + dedup + barrio search + FK concurrency fix + skip procesados. (Hitos 2-3,5)
- Sesión 1-5 — Setup Turso, Playwright+unpdf parser+encoding, GH Actions, Frontend Next15 fixes TS root/DB direct call/SWR key. (Hitos 1,4,5)