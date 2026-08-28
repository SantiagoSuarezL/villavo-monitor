# PRD — Villavo Monitor

> Qué debe construir el proyecto. Fuente: `README.md:3-4`, `scraper-skill.md`, `villavo-frontend.md`, `README.md` raíz + comportamiento real en `src/` y `scraper/`.

## 1. Resumen

Monitoreo automatizado del estado del suministro de agua en **Villavicencio, Colombia**, consumiendo los comunicados PDF diarios de la **EAAV (Empresa de Acueducto y Alcantarillado de Villavicencio)**. El sistema descarga PDFs, extrae estado por sector y barrio, normaliza encoding, persiste en Turso y expone un dashboard web en tiempo real.

**Tagline**: “Estado del suministro de agua · EAAV Villavicencio” (`src/app/page.tsx:75`).

## 2. Problema y oportunidad

- La EAAV publica comunicados diarios en PDF en `https://www.eaav.gov.co/#/documentos/Comunicados_Suministro_de_Agua` (SPA). El formato es poco accesible, varía por día y usa encoding Latin-1 corrupto.
- Ciudadanos necesitan saber **hoy** si su barrio/sector tiene agua, con horario o baja presión, sin abrir PDFs.
- Automatizar descarga + parsing + historial mensual permite alertas implícitas (chip de frescura) y análisis por barrio.

## 3. Usuarios

| Usuario | Necesidad principal |
|---------|---------------------|
| **Ciudadano de Villavicencio** | Buscar su barrio y ver estado de hoy + historial del mes |
| **Operador/observador** | Ver resumen global (cuántos sectores con/sin agua) y frescura del dato |
| **Mantenedor del scraper** | Que el pipeline sea idempotente, tolere PDFs faltantes y no duplique datos |

## 4. Alcance (scope)

### Dentro de alcance ( hoy )
- **Scraper** multi-PDF del mes actual (`scraper/index.ts:49` `scrapeAllReportsThisMonth`): navega con Playwright, filtra por mes en español (`MESES` `scraper/index.ts:12`), solo formato estándar `SUMINISTRO DEL SERVICIO DD DE MES` (`scraper/index.ts:82`), skip de fechas ya procesadas (`getProcessedDates()`), manejo 404, extracción concurrente + escritura secuencial, retención 90 días (`cleanOldData`).
- **Parsing** (`scraper/parser.ts`): `extractTextFromPDF` con `unpdf`, `normalizeEncoding` con `encodingMap`, `parseSectores` con estados `EstadoServicio` (6 valores), horarios `to24h`, barrios (`parseBarrios` con tratamiento `, y `), subsectores (`es_subsector`, `padre` Caño Grande/Plantas).
- **Persistencia** Turso: `sectores`, `barrios`, `reportes_diarios`, `reporte_barrios`, `alias_normalizacion` + índice único `idx_reporte_unico(sector_id, fecha)`, UPSERT y dedup (`migrate.ts:72-91`).
- **Frontend** Next.js 15 App Router: header sticky con chip de frescura, 4 cards de resumen, búsqueda + filtro por sector, tabla responsive (desktop `Fecha|Sector|Estado|Barrios|Actualización`, móvil cards), expansión `+N más`, gráfico de historial por barrio (recharts, solo cuando `q` tiene valor).
- **APIs**: `GET /api/reports?q&sector_id` (últimos 30 días), `GET /api/sectores`, `GET /api/summary` (día más reciente).
- **Automatización**: GitHub Actions 2×/día 8AM/2PM Colombia (`scraper.yml:5`), `workflow_dispatch`, Vercel hosting.

### Fuera de alcance (no construir ahora)
- Notificaciones push/email/WhatsApp, app móvil nativa, autenticación de usuarios, edición manual de reportes, predicción de suministro, multi-ciudad, PDFs históricos >90 días, OCR para PDFs escaneados.

## 5. User stories (criterios de aceptación)

**US1 — Buscar mi barrio**
> Como ciudadano, quiero escribir “Barzal” y ver todos los reportes de los últimos 30 días que mencionan ese barrio, para saber si hoy tengo agua.
- Input con debounce 300ms (`search-bar.tsx`), navega `?q=` en URL, `q` entra en SWR key (`data-table.tsx:70`) y en `EXISTS (SELECT ... LIKE ?)` (`api/reports/route.ts:33` + `page.tsx:33`). DoD: `curl /api/reports?q=Barzal` retorna solo filas con ese barrio.

**US2 — Filtrar por sector**
> Como usuario, quiero filtrar por sector para acotar resultados.
- Dropdown `sectores-filter.tsx` con `GET /api/sectores`, combina con `q` en misma query. DoD: `/api/reports?sector_id=3&q=...` respeta ambos.

**US3 — Resumen del día**
> Como observador, quiero ver 4 cards: con servicio, sin servicio, baja presión, total monitoreado, del día más reciente.
- `GET /api/summary` agrega con `SUM(CASE WHEN estado ...)` (`summary/route.ts:12-16`), `summary-cards.tsx` lo renderiza. DoD: `curl /api/summary` retorna `{fecha, total_sectores, con_servicio, sin_servicio, baja_presion, ultima_actualizacion}`.

**US4 — Frescura del dato**
> Como usuario, quiero saber hace cuánto se actualizó (🟢<60min, 🟡<24h, 🔴>24h) con polling.
- `update-chip.tsx:12-29` calcula `diffMin` vs `ultima_actualizacion`, polling `refreshInterval: 60000` (`update-chip.tsx:33`). DoD: chip cambia color según `Date.now() - ultima_actualizacion`.

**US5 — Historial por barrio**
> Como ciudadano que buscó “Barzal”, quiero ver un gráfico del mes con el estado por día coloreado.
- `history-chart.tsx` con `ESTADO_LEVELS` (level 0-3, colores), `LineChart` + `CustomDot` (`history-chart.tsx:61`), solo si `q` no vacío y hay datos (`page.tsx:107`), título `Historial de [q] — [Mes Año]`. DoD: buscar “Barzal” muestra puntos verde/azul/amarillo/rojo por fecha.

**US6 — Tabla usable en móvil y desktop**
> Como usuario móvil (375px), quiero cards apiladas; en desktop (1280px) tabla completa.
- `data-table.tsx:92-103` switch `hidden sm:block` / `sm:hidden`, `formatFecha` como “20 may” (`data-table.tsx:53`), `MAX_VISIBLE_BARRIOS=3` con `+N más` expandible (`data-table.tsx:67`). DoD: verificación viewport en `villavo-frontend.md:148-164`.

**US7 — Pipeline idempotente**
> Como mantenedor, quiero que corridas repetidas no dupliquen y que datos viejos se purguen.
- `getProcessedDates()` filtra por `YYYY-MM` (`scraper/db.ts:122`), `insertReporte` UPSERT (`db.ts:102`), `idx_reporte_unico`, `cleanOldData()` 90d (`db.ts:140`). DoD: re-ejecutar scraper sin PDFs nuevos → “Base de datos al día”.

## 6. Estados del servicio (semaforización)

Fuente `README.md:139-146` + `parser.ts:3-9` + `villavo-frontend.md:132-136` + `data-table.tsx:17-50`:

| Estado (DB) | Badge label | Color text/bg | Significado |
|-------------|-------------|---------------|-------------|
| `con_servicio` | Con servicio | `#16a34a` / `#dcfce7` | Servicio activo |
| `suministro_normal` | Suministro normal | `#16a34a` / `#dcfce7` | Servicio activo (variante) |
| `con_servicio_horario` | Con servicio horario | `#2563eb` / `#dbeafe` | Con horario definido (`hora_inicio`, `hora_fin`) |
| `baja_presion` | Baja presión | `#ca8a04` / `#fef9c3` | Presión reducida |
| `llenado_presurizacion` | Llenado/Presurización | `#ca8a04` / `#fef9c3` | Presurización tubería |
| `pendiente_servicio` | Pendiente de servicio | `#dc2626` / `#fee2e2` | Sin servicio |

UI general: background `#f9fafb`, cards `#ffffff` border `#e5e7eb`, texto principal `#111827`, secundario `#6b7280` (`villavo-frontend.md:138-143`, `page.tsx:70`).

## 7. Requisitos no funcionales

- **Disponibilidad datos**: actualización 2×/día, retención 90 días, queries limitadas a 30 días (`page.tsx:14`).
- **Performance**: extracción PDFs en paralelo (`Promise.all` `index.ts:154`), DB secuencial para evitar FK races (`lessons_learned.md:59-64`); SWR `refreshInterval` 5min tabla, 60s chip; `force-dynamic` (`page.tsx:55`).
- **Robustez**: tolera 404 (`index.ts:123`), `unhandledRejection` (`index.ts:7`), normalización encoding con warning (`parser.ts:57`), `CREATE TABLE IF NOT EXISTS` + dedup antes de índice único (`migrate.ts:73-85`).
- **Compatibilidad**: Node >=20 (CI Node 24), pnpm workspaces, Playwright chromium + sys deps (`tech_stack.md:33`).
- **Seguridad/ENV**: validación explícita `TURSO_DATABASE_URL/AUTH_TOKEN` con throw (`src/lib/db.ts:10`), secrets en GH Actions (`scraper.yml:33`), SSL bypass solo para `stage.eaav.gov.co` (`index.ts:116`) — verificar cert de `www.eaav.gov.co` antes de prod.

## 8. Métricas de éxito

- PDFs del mes procesados / día sin duplicados (`processedDates.size` log).
- Latencia `GET /api/summary` y `reports` <500ms p95 (Turso).
- Tasa de parsing sin `⚠ Encoding` restante (`parser.ts:57` → 0).
- Uso de búsqueda por barrio (presencia de `q` en logs).
