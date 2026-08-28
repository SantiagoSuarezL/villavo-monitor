# Lessons Learned — ARCHIVO — villavo-monitor

> Reglas verbatim de fases rotadas. No se lee automático.
> Se consulta solo bajo demanda (grep por número de regla o palabra clave)
> cuando una tarea actual toca un módulo de una fase vieja.
> El índice de qué reglas viven acá está en `lessons_learned.md` (memoria activa).

## Archivo de reglas

### Archivadas 2026-08-27 — Rotación Fase 9 (quedan en activo: 1-4, 10-11)

### Regla de Oro 5 [Parser - Encoding]: Identity Mappings en EncodingMap

**Error:** `normalizeEncoding()` reportaba "caracteres corruptos restantes" para `º` incluso después del mapa, porque `º`→`º` es identity y el chequeo iteraba sobre `Object.keys(encodingMap)`.

**Root Cause:** El loop de verificación contaba todas las keys sin excluir identity mappings (`scraper/parser.ts:49-51`).

**Solución:** Filtrar `Object.keys(encodingMap).filter(k => encodingMap[k] !== k)` antes de contar restantes (`scraper/parser.ts:49`).

**Regla de Oro:** *Excluye identity mappings del conteo de caracteres corruptos restantes en normalizeEncoding.*

### Regla de Oro 6 [Scraper - Playwright]: Dependencias del sistema para Playwright

**Error:** `error while loading shared libraries: libnspr4.so: cannot open shared object file` al lanzar `chromium_headless_shell`.

**Root Cause:** `pnpm playwright install chromium` no instala sys deps; `--with-deps` necesita sudo para apt.

**Solución:** `sudo apt install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2` o CI `playwright install chromium --with-deps`. No usar `/tmp/` workaround (se pierde en WSL2).

**Regla de Oro:** *Verifica las librerías del sistema (`ldd`) antes de depurar el código cuando Playwright no inicia.*

### Regla de Oro 7 [Tooling - TypeScript]: TypeScript en workspace root para Next.js 15

**Error:** `next build --no-lint` se cuelga indefinidamente tras `✓ Compiled successfully` en `Checking validity of types...` sin error; `tsc --noEmit` suelto funciona.

**Root Cause:** Next 15 inicia type checking interno pero no encuentra `typescript` en workspace raíz del monorepo (solo en `scraper/`).

**Solución:** `pnpm add -D typescript -w` en root.

**Regla de Oro:** *Siempre instala `typescript` como devDependency en el workspace root de un proyecto Next.js 15 monorepo.*

### Regla de Oro 8 [DB - Migración]: Limpieza de duplicados antes de CREATE UNIQUE INDEX

**Error:** `CREATE UNIQUE INDEX IF NOT EXISTS idx_reporte_unico` falla `SQLITE_CONSTRAINT` por filas duplicadas `(sector_id,fecha)` de dos formatos PDF del mismo día.

**Root Cause:** Scraper descargaba ambos formatos sin índice único, insertando duplicados en `reportes_diarios`.

**Solución:** Antes del índice: `DELETE FROM reporte_barrios WHERE reporte_id NOT IN (SELECT MIN(id) GROUP BY sector_id,fecha)` y `DELETE FROM reportes_diarios WHERE id NOT IN (SELECT MIN(id) GROUP BY sector_id,fecha)` (`scraper/migrate.ts:79-83`), además filtrar solo formato estándar (`scraper/index.ts:82`).

**Regla de Oro:** *Antes de crear un `CREATE UNIQUE INDEX` en tabla existente, limpia duplicados primero (DELETE hijos FK → DELETE padres conservando MIN(id)).*

### Regla de Oro 9 [DB - Concurrencia]: Operaciones DB concurrentes con FKs en Turso/libsql

**Error:** Procesar 3 PDFs con `Promise.all` causa `FOREIGN KEY constraint failed` en `reporte_barrios` ↔ `reportes_diarios`.

**Root Cause:** Cada función DB abre conexión Turso independiente; concurrencia sin coordinación entre conexiones viola FK.

**Solución:** Separar en dos fases — extracción `Promise.all` concurrente y DB secuencial `for` loop (`scraper/index.ts:130-161`).

**Regla de Oro:** *Nunca ejecutes operaciones DB con FKs cruzadas en paralelo desde conexiones independientes contra Turso/libsql. Separa I/O pesado en paralelo y DB en secuencial.*

---

Fuente histórica completa: `.agent/memory-archive/lessons_learned.md:1-64` (copiado el 2026-08-27)
