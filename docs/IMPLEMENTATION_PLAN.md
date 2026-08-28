# IMPLEMENTATION_PLAN — Villavo Monitor

> Orden de construcción y Definition of Done. Fuente: `.agent/memory-archive/roadmap.md`, `prompt.md:8-35`, historial `session_log.md`, y estado real de `scraper/*` + `src/*`.

## 1. Principios de ejecución

- **Secuencial por hito**: no avanzar sin `✓` del usuario (`ENGINEERING_PRINCIPLES.md:1.2`).
- **Dependencias pnpm only** (`ENGINEERING_PRINCIPLES.md:2`).
- **Cada hito**: muestra comando de verificación y espera resultado (`ENGINEERING_PRINCIPLES.md:1.3`).
- **Errores no previstos**: describe + 2 propuestas antes de tocar código (`ENGINEERING_PRINCIPLES.md:1.4`).

## 2. Roadmap — fases, estado y DoD

| Fase | Estado | Descripción (qué se construye) | DoD — comando de verificación |
|------|--------|--------------------------------|-------------------------------|
| **Hito 1 — Base de Datos y Schema (Turso)** | ✓ COMPLETADO | Conexión `getDbClient`, tablas `sectores/barrios/reportes_diarios/reporte_barrios/alias_normalizacion` (`scraper/migrate.ts:14-63`), scripts migración idempotente | `cd scraper && pnpm migrate` → `✓ Conexión Turso exitosa` + `✓ Tablas creadas` (sin `✗`) |
| **Hito 2 — Scraper multi-PDF (refactorizado)** | ✓ COMPLETADO | `scrapeAllReportsThisMonth()` reemplaza `scrapeLatestReport`, filtro mes español `SUMINISTRO DEL SERVICIO DD DE MES`, 404 skip, `extractDateFromFileName()`, 2 fases (extract paralelo + DB secuencial), UPSERT + `idx_reporte_unico` + `deleteReporteBarrios` | `cd scraper && pnpm start` procesa N PDFs nuevos, log `✓ PDFs nuevos a descargar: N` + `✓ Total PDFs procesados: N`; re-ejecución sin PDFs nuevos → `✓ Base de datos al día` |
| **Hito 3 — Carga multi-PDF a Turso (refactorizado)** | ✓ COMPLETADO | Dedup antes de índice `DELETE MIN(id) GROUP BY sector_id,fecha` (`migrate.ts:79-83`), `INSERT ... ON CONFLICT DO UPDATE` (`db.ts:102`), `deleteReporteBarrios` antes de re-insert, hasta ~22 PDFs/día | `migrate` no falla con `SQLITE_CONSTRAINT`; `SELECT COUNT(*)-COUNT(DISTINCT sector_id\|\|fecha) FROM reportes_diarios` → 0 |
| **Hito 4 — Automatización GH Actions** | ✓ COMPLETADO | Workflow `scraper.yml:4-5` cron `0 13,19 * * *` (8AM/2PM CO) + `workflow_dispatch`, secrets doc, `unhandledRejection` (`index.ts:7`), `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` | GH Actions UI → Run workflow manual OK; `pnpm tsc --noEmit` en `scraper/` sin errores; check cron en `scraper.yml:5` |
| **Hito 5 — Frontend búsqueda por barrio (ampliado)** | ✓ COMPLETADO | `GET /api/reports?q` con `EXISTS LIKE` (`route.ts:33`), `SearchBar` 300ms → `?q=`, `DataTable` SWR key `sector_id+q` (`data-table.tsx:70`), `page.tsx` DB directa (no fetch interno), TS en root | `pnpm tsc --noEmit` OK; `curl "http://localhost:3000/api/reports?q=Barzal"` filtra; `curl "/api/reports?sector_id=1&q=..."` respeta ambos |
| **Hito 6 — Testing y Optimización** | **Parcial** — Opt. ✓, Tests **pendiente** | Opt: `getProcessedDates()` filtrado `YYYY-MM%` (`db.ts:125`), `cleanOldData()` 90d (`db.ts:140` + `index.ts:141`). Pendiente: pruebas unitarias/integración (parser `parseSectores`, `normalizeEncoding`, APIs), monitoreo | `cd scraper && pnpm start` log `✓ Fechas ya en DB: N` (solo mes actual) + `✓ Limpieza: N reportes viejos eliminados` si aplica; tests pendientes → `pnpm test` (cuando exista) sin fallos |
| **Hito 7 — Rediseño Frontend Layout+Charts+Responsive** | ✓ COMPLETADO | Tareas 1-5 `villavo-frontend.md`: `GET /api/summary` agregación (`summary/route.ts:9`), header sticky (`page.tsx:71`), 4 summary-cards, search+filter fila responsive, tabla desktop + cards móvil (`data-table.tsx:92`), `+N más` (`L67`), `history-chart.tsx` recharts (`L61`), `update-chip.tsx` polling 60s | `pnpm tsc --noEmit` OK; `curl /api/summary` → `{fecha,total_sectores,con_servicio,sin_servicio,baja_presion,ultima_actualizacion}`; visual: desktop 1280px 4 cards fila + tabla completa, móvil 375px 2×2 cards + cards apiladas; buscar `Barzal` → gráfico encima tabla |
| **Hito 8 — Reorganización Documental → docs/ canónico** | **EN CURSO (2026-08-27)** | Consolidar 5 docs viejos en 6 canónicos `README, PRD, ARCHITECTURE, TECHNICAL_SPEC, ENGINEERING_PRINCIPLES, IMPLEMENTATION_PLAN` (español), actualizar `memory-archive/tech_stack, roadmap, session_log`, eliminar viejos | `ls -1 docs/` → exactamente 6 archivos listados; `cat docs/README.md` muestra índice; `pnpm tsc --noEmit` sigue OK; `ls .agent/memory-archive/` actualizado |

## 3. Pendientes críticos detectados (no parte del plan original pero bloqueantes)

- **Testing Hito 6**: falta suite tests (parser edge cases, API filters, encoding map). Propuesta: `vitest` para `parser.ts` (mocks `extractText`), supertest para APIs con DB mock. No instalar sin confirmar (regla deps).
- **Sync `.agent/memory/` desde `memory-archive`**: plantilla bootstrap vacía (`memory/roadmap.md:10-14`). Dejar para hito 9 posterior a validar Hito 8.
- **Vercel env**: verificar `TURSO_*` en Vercel dashboard si deploy falla.

## 4. Orden recomendado para retomar

1. **Cerrar Hito 8**: verificar `docs/` (esta tarea) → commit `docs: reorganiza a 6 canónicos`.
2. **Decidir Hito 6 testing**: confirmar con usuario si se prioriza tests o nueva feature; si sí, crear plan de tests detallado (no avanzar sin confirmación).
3. **Hito 9 futuro**: sync `.agent/memory/` desde `memory-archive` + `graphify update .` tras cualquier cambio de código.

## 5. Comandos de verificación globales

```bash
# Typecheck raíz + scraper
pnpm tsc --noEmit
cd scraper && pnpm tsc --noEmit; cd ..

# Lint
pnpm lint

# Build Next (requiere TS en root)
pnpm build

# APIs locales (con dev server)
curl http://localhost:3000/api/summary | jq
curl "http://localhost:3000/api/reports?q=Barzal" | jq
curl http://localhost:3000/api/sectores | jq

# Scraper local (requiere .env + chromium)
cd scraper && pnpm start

# Docs sanity
ls -1 docs/          # debe listar 6 archivos canónicos
cat docs/README.md   # índice visible
graphify update .    # tras cambios de código
```

## 6. Criterio Done por tipo de tarea

- **Nueva API**: contrato documentado en `TECHNICAL_SPEC.md` §5 + handler `route.ts` + test `curl` + `pnpm tsc --noEmit` OK.
- **Componente UI**: sigue `villavo-frontend.md` paleta y responsive (ver `TECHNICAL_SPEC.md` §6) + `Suspense` + SWR con `revalidateOnFocus:false` + verificación viewports 375/1280.
- **Scraper**: mantiene 2 fases + UPSERT + 404 handling + logs `✓/⚠` + verificación `getProcessedDates` mes actual + `cleanOldData` 90d.
