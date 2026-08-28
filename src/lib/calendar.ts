import { ESTADOS, ESTADO_FALLBACK } from '@/lib/estados';
import type { Reporte } from '@/lib/reporte';

/**
 * Helpers puros para el calendario heatmap mensual.
 * Extraídos para ser testeables sin DOM (vitest node).
 * Cubre: groupByFecha (min level = peor), grid lunes-domingo, colores, SWR key.
 */

export type ReporteInput = Pick<Reporte, 'fecha' | 'estado'> & Partial<Reporte>;

const LEVEL_COLORS: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  for (const info of Object.values(ESTADOS)) {
    if (map[info.level] === undefined) map[info.level] = info.color;
  }
  // Asegura fallback para -1 y para niveles no mapeados
  if (map[-1] === undefined) map[-1] = ESTADO_FALLBACK.color;
  // Fallbacks explícitos por si ESTADOS cambia
  if (map[3] === undefined) map[3] = '#16a34a';
  if (map[2] === undefined) map[2] = '#2563eb';
  if (map[1] === undefined) map[1] = '#ca8a04';
  if (map[0] === undefined) map[0] = '#dc2626';
  return map;
})();

/** Obtiene level numérico para un estado; fallback -1 si desconocido. */
export function getLevelForEstado(estado: string): number {
  return ESTADOS[estado]?.level ?? ESTADO_FALLBACK.level;
}

/** Obtiene color para un level; fallback gris si desconocido. */
export function getColorForLevel(level: number): string {
  return LEVEL_COLORS[level] ?? ESTADO_FALLBACK.color;
}

/**
 * Agrupa reportes por fecha tomando el peor level (mínimo) del día.
 * Si un día tiene múltiples reportes con diferentes estados, toma min level.
 * Ej: con_servicio (3) + pendiente_servicio (0) → 0
 */
export function groupByFecha(reportes: ReporteInput[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of reportes) {
    if (!r.fecha || typeof r.fecha !== 'string') continue;
    const level = getLevelForEstado(r.estado);
    const prev = map.get(r.fecha);
    if (prev === undefined) {
      map.set(r.fecha, level);
    } else {
      map.set(r.fecha, Math.min(prev, level));
    }
  }
  return map;
}

/**
 * Variante que además guarda el reporte representativo (el que tiene peor level).
 * Útil para click → open(reporte).
 * Si hay empate en level, conserva el primero encontrado (el más reciente si vienen ordenados DESC).
 */
export function groupByFechaWithReporte(
  reportes: ReporteInput[],
): Map<string, { level: number; reporte: ReporteInput }> {
  const map = new Map<string, { level: number; reporte: ReporteInput }>();
  for (const r of reportes) {
    if (!r.fecha || typeof r.fecha !== 'string') continue;
    const level = getLevelForEstado(r.estado);
    const prev = map.get(r.fecha);
    if (prev === undefined) {
      map.set(r.fecha, { level, reporte: r });
    } else if (level < prev.level) {
      map.set(r.fecha, { level, reporte: r });
    }
  }
  return map;
}

/** Días en el mes (month 1-12). */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Primer día de la semana para el mes, ajustado a lunes=0 … domingo=6.
 * JS getDay: 0=dom … 6=sab. Conversión: (jsDay + 6) % 7
 */
export function getFirstWeekdayMonday(year: number, month: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay();
  return (jsDay + 6) % 7;
}

/**
 * Celdas planas del calendario: [null x offset, 1..daysInMonth]
 * null representa celda vacía antes del día 1.
 */
export function getCalendarCells(year: number, month: number): Array<number | null> {
  const offset = getFirstWeekdayMonday(year, month);
  const days = getDaysInMonth(year, month);
  const cells: Array<number | null> = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

/** Grilla semanal: corta celdas en semanas de 7. */
export function getCalendarWeeks(year: number, month: number): Array<Array<number | null>> {
  const cells = getCalendarCells(year, month);
  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** Construye clave SWR; null desactiva fetch (con q vacío → no fetch). */
export function buildSWRKey(q: string | null | undefined): string | null {
  if (!q || q.trim().length === 0) return null;
  return `/api/reports?q=${encodeURIComponent(q.trim())}`;
}

/** Alias semántico para tests: ¿debe hacer fetch? */
export function shouldFetch(q: string | null | undefined): boolean {
  return buildSWRKey(q) !== null;
}

/**
 * Utilidad para el componente heatmap: dado year/month y map fecha→level,
 * genera datos por celda listos para render (color, fecha ISO, etc).
 */
export interface CalendarCell {
  day: number | null;
  fecha: string | null; // YYYY-MM-DD si day no es null
  level: number | null;
  color: string | null;
  isEmpty: boolean;
}

export function getCalendarCellData(
  year: number,
  month: number,
  fechaLevelMap: Map<string, number>,
): CalendarCell[] {
  const cells = getCalendarCells(year, month);
  const monthStr = String(month).padStart(2, '0');
  return cells.map((day) => {
    if (day === null) {
      return { day: null, fecha: null, level: null, color: null, isEmpty: true };
    }
    const fecha = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    const level = fechaLevelMap.get(fecha) ?? null;
    const color = level !== null ? getColorForLevel(level) : null;
    return { day, fecha, level, color, isEmpty: false };
  });
}

/**
 * Helper para page.tsx / componente: determina si HistoryChart debe mostrarse.
 * Replicando lógica de page.tsx:132 {q && <HistoryChart q={q}>} dentro de PendingOverlay
 */
export function shouldShowHistoryChart(q: string | null | undefined): boolean {
  return Boolean(q && q.trim().length > 0);
}

/** Retorna null si no hay datos (para que componente retorne null). */
export function hasCalendarData(reportes: ReporteInput[] | null | undefined): boolean {
  return Boolean(reportes && reportes.length > 0);
}
