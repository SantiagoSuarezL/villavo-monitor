# Lessons Learned — villavo-monitor

> MEMORIA ACTIVA. Se lee completa al inicio de sesión.
> Reglas de fases viejas: ver `lessons_learned_archive.md` (NO se lee
> automático, solo por grep/keyword si la tarea actual toca esa fase).
> Regla de rotación: este archivo debe contener solo las reglas de las
> últimas 2 fases. Al cerrar una fase nueva, la más vieja de las que
> quedan acá pasa al archivo y se reemplaza por una línea de índice abajo.

## Índice de reglas archivadas

- Reglas 5-9 [Parser/Scraper/Tooling/DB] → `lessons_learned_archive.md` (archivadas 2026-08-27 al cerrar Fase 9; quedan en activo 1-4, 10-11. Fuente original `.agent/memory-archive/lessons_learned.md:1-64`)

---

## Reglas activas

### Regla de Oro 1 [Gestión de Dependencias]: No instales sin consultar hito

**Error:** Instalación de paquetes no autorizados que generan conflictos.

**Root Cause:** Asumir dependencias necesarias sin verificar el plan del hito (`docs/CLAUDE.md:11`, `project-rules.md:9`).

**Solución:** Revisar `IMPLEMENTATION_PLAN.md` fase actual antes de `pnpm add`; proponer y esperar confirmación.

**Regla de Oro:** *Usa únicamente las dependencias especificadas en el hito actual.*

### Regla de Oro 2 [Sincronización de Hitos]: No avances sin confirmación

**Error:** Trabajo adelantado que necesita rehacerse por cambios de requisitos.

**Root Cause:** Interpretación anticipada de requisitos futuros.

**Solución:** Esperar confirmación explícita antes de pasar al siguiente hito (`IMPLEMENTATION_PLAN.md`).

**Regla de Oro:** *Confirma la finalización de cada hito antes de comenzar el siguiente.*

### Regla de Oro 3 [Verificación de Resultados]: Muestra comando y espera

**Error:** Asumir que un proceso funcionó sin validar la salida.

**Root Cause:** Falta de validación de los resultados esperados.

**Solución:** Ejecutar `pnpm tsc --noEmit`, `curl /api/summary`, `ls docs/` etc. y analizar salida antes de cerrar hito.

**Regla de Oro:** *Valida explícitamente el éxito de cada hito mediante comandos de verificación.*

### Regla de Oro 4 [Manejo de Errores]: Describe y propone max 2 soluciones

**Error:** Modificaciones precipitadas que empeoran el problema.

**Root Cause:** Actuar sin entender completamente el problema.

**Solución:** Analizar error, documentarlo y proponer max 2 soluciones antes de implementar (`ENGINEERING_PRINCIPLES.md:1.4`).

**Regla de Oro:** *Documenta errores inesperados y propone soluciones antes de hacer cambios.*

### Regla de Oro 10 [Frontend - Hydration]: toLocaleDateString en SSR causa mismatch

**Error:** `Hydration failed because the server rendered HTML didn't match the client` al usar `toLocaleDateString('es-CO')` en `data-table.tsx:53`, `history-chart.tsx:39` y `update-chip.tsx:26` (fecha corta `27 de ago`, mes largo, fecha numérica `27/08/2026`).

**Root Cause:** `toLocaleDateString` depende de datos ICU del runtime; Node (servidor) y navegador pueden formatear distinto (`27 de ago` vs `27 ago.` vs fallback sin locale) y el render SSR difiere del hidratado en cliente, violando la invariante de React.

**Solución:** Reemplazar todo formateo por helpers determinísticos con array `MESES_ES` hardcodeado en `src/lib/estados.ts:25-52` (`formatFechaCorta` → `27 de ago`, `formatMesAnio` → `agosto de 2026`, `formatFechaNumerica` → `27/08/2026`). Usado en `data-table.tsx`, `history-chart.tsx`, `update-chip.tsx` y `reveal`/`modal`.

**Regla de Oro:** *Nunca uses `toLocaleDateString` en componentes SSR; usa helpers determinísticos con meses hardcodeados.*

### Regla de Oro 11 [Datos - Formato]: CURRENT_TIMESTAMP con espacio, no T

**Error:** Columna `ACT.` mostraba `2026-` en vez de hora; `extractTime` hacía `substring(0,5)` sobre `hora_monitoreo` con valor SQLite `CURRENT_TIMESTAMP` (`2026-08-27 18:19:33` con espacio, no `T`) y no validaba formato; además la hora estaba en UTC sin convertir a CO.

**Root Cause:** Asumir formato ISO con `T` sin verificar el formato real en DB (`DATETIME DEFAULT CURRENT_TIMESTAMP` usa espacio); falta de validación regex y de conversión de zona horaria Colombia (UTC-5 fijo).

**Solución:** En `src/lib/reporte.ts:10-22` hacer `split(/[T ]/)`, validar `time` con `/^\d{2}:\d{2}/` (retorna `—` si falta), convertir a hora CO con `(h - 5 + 24) % 24` y formatear `HH:mm` determinístico (sin `Intl`, hydration-safe).

**Regla de Oro:** *Verifica el formato real en DB antes de parsear fechas/horas; valida con regex y maneja ambos separadores `T` y espacio.*

