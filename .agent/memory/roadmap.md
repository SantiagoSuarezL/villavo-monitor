# Roadmap — villavo-monitor

> Estado (✅/[ ]) + referencia. Detalle vive en lessons/session_log.
> La lista de fases se completa UNA vez durante el bootstrap, copiando los
> nombres/orden de fases desde IMPLEMENTATION_PLAN.md. Después de eso, solo
> se actualiza el estado (✅/[ ]) de cada fase — no se vuelve a copiar el
> plan completo.

## Fases

- [x] **Fase 1 — Base de Datos y Schema (Turso)** — Conexión `getDbClient`, tablas `sectores/barrios/reportes_diarios/reporte_barrios/alias_normalizacion` + `migrate.ts` idempotente. Ref: `session_log.md: Fase 1-4`
- [x] **Fase 2 — Scraper multi-PDF (refactorizado)** — `scrapeAllReportsThisMonth()`, filtro mes español `SUMINISTRO DEL SERVICIO DD DE MES`, 404 skip, 2 fases extract paralelo + DB secuencial, UPSERT + `idx_reporte_unico`. Ref: `lessons_learned.md: 8, 9`
- [x] **Fase 3 — Carga multi-PDF a Turso (refactorizado)** — Dedup antes de índice `MIN(id) GROUP BY sector_id,fecha` (`migrate.ts:79-83`), `ON CONFLICT DO UPDATE` (`db.ts:102`), `deleteReporteBarrios`. Ref: `lessons_learned.md: 8`
- [x] **Fase 4 — Automatización GitHub Actions** — Workflow `scraper.yml` cron `0 13,19 * * *` (8AM/2PM CO) + `workflow_dispatch`, `unhandledRejection`, `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`. Ref: `ARCHITECTURE.md:7`
- [x] **Fase 5 — Frontend Búsqueda por barrio (ampliado)** — `GET /api/reports?q` `EXISTS LIKE` (`route.ts:33`), `SearchBar` 300ms → `?q=`, `DataTable` SWR `sector+q` (`data-table.tsx:70`), `page.tsx` DB directa, TS en root. Ref: `lessons_learned.md: 7`
- [ ] **Fase 6 — Testing y Optimización** — Opt ✓ (`getProcessedDates` `YYYY-MM%` `db.ts:125`, `cleanOldData` 90d `db.ts:140`); Tests pendientes (unit `parser.ts`, integration APIs, `vitest` propuesto). Ref: `IMPLEMENTATION_PLAN.md: Hito 6`
- [x] **Fase 7 — Rediseño Frontend Layout + Charts + Responsive** — `GET /api/summary` (`summary/route.ts:9`), header sticky + 4 cards, search+filter responsive, tabla desktop/cards móvil `+N más`, `history-chart.tsx` recharts, `update-chip.tsx` 60s. Ref: `session_log.md: Fase 7`
- [x] **Fase 8 — Reorganización Documental → docs/ canónico** — Consolidar 5→6 docs (`README/PRD/ARCHITECTURE/TECHNICAL_SPEC/ENGINEERING_PRINCIPLES/IMPLEMENTATION_PLAN`), actualizar `memory-archive`, `ls docs/==6`, `pnpm tsc --noEmit` OK. Ref: `session_log.md: Fase 8`
- [x] **Fase 9 — Rediseño Visual "Papel Técnico"** (2026-08-27) — Design system light paper-technical: tokens `@theme`, shell 6px/1600px, header progressive-blur, frames L-brackets + mono 01-04, reveal vanilla; glosario estados (modal accesible + badges clickeables, fuente única `lib/estados.ts`); 5 correcciones (ACT. UTC→CO `lib/reporte.ts`, limpiar búsqueda ✕, icon.svg, dropdown último día MAX fecha/"Ver todos", full-width 1600px); búsqueda suave `NavPendingProvider` useTransition (spinner+blur) + modal detalle sector/barrios + `Modal` base. Cero deps nuevas, fechas determinísticas (Ref: 10,11). Ref: `session_log.md: Sesión 12`

---

## Pendientes Críticos Detectados

- **Testing Hito 6** — Falta suite tests (parser `parseSectores`/`normalizeEncoding`, API filters, encoding map). Propuesta `vitest` + supertest con DB mock. No instalar sin confirmar (`ENGINEERING_PRINCIPLES.md:1.1`).
- **Vercel env** — Verificar `TURSO_DATABASE_URL/AUTH_TOKEN` en dashboard Vercel si deploy falla (ver `TECHNICAL_SPEC.md:2`).
- **Sync observability** — `observations.md` vacío actualmente; monitorear parsing sin `⚠ Encoding` restante (`parser.ts:57`) y latencia APIs <500ms como métrica futura.
