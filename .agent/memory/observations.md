# Observaciones — villavo-monitor

> 5to archivo del protocolo, explícito (no un archivo suelto). Solo
> observaciones EN CURSO (no resueltas todavía, requieren más monitoreo).
> Una vez que una observación se convierte en regla de código confirmada,
> se archiva en `observations_archive.md` y queda solo una línea de cierre
> acá apuntando a la Regla de Oro correspondiente en `lessons_learned.md`.

Formato de cada entrada: fecha, target/módulo, observación, hipótesis, estado, acción.

## En curso

### 2026-08-28 — Vercel deploy — verificar env TURSO_* tras features PWA/OG/SEO

- **Observación:** Se agregaron `opengraph-image.tsx` (nodejs runtime, query Turso) y `sitemap.ts` (dinámicas `?sector_id` vía getDbClient). En Vercel el build necesita `TURSO_DATABASE_URL/AUTH_TOKEN` (fallback try/catch ya cubre si falta, pero degrada OG a "Sin datos" y sitemap a solo base).
- **Hipótesis:** Si `TURSO_*` no está en dashboard Vercel, `pnpm build` de CI podría fallar o servir OG degradado.
- **Estado:** En monitoreo — verificar primer deploy de `main` tras push; revisar dashboard Vercel para `TURSO_*`.
- **Acción:** Si falla, agregar secrets en Vercel (ver `TECHNICAL_SPEC.md:2`) y documentar como Regla de Oro.

### 2026-08-27 — GH Actions / Turso — Workflow deshabilitado tras 60d inactividad

- **Observación:** GitHub deshabilitó automáticamente `EAAV Scraper` (schedule `0 13,19 * * *`) tras 60 días sin push; usuario reactivó manual y corrió `workflow_dispatch` de agosto con éxito (datos visibles).
- **Hipótesis:** Si el repo vuelve a quedar inactivo, el schedule se deshabilitará de nuevo; además `TURSO_DATABASE_URL/AUTH_TOKEN` en Vercel podría expirar sin uso.
- **Estado:** En monitoreo — verificar próximos 2 cron (8AM/2PM CO) en pestaña Actions.
- **Acción:** Si falla de nuevo, documentar como Regla de Oro y proponer keepalive (push vacío o re-dispatch semanal).

## Cerradas (línea de cierre)

- [Resuelta 2026-08-27] Hydration `toLocaleDateString` → blindada con helpers determinísticos `MESES_ES` en `lib/estados.ts` — ver **Regla de Oro 10** (`lessons_learned.md:10`).
