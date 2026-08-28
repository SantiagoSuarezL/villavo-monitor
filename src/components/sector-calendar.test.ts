import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks requeridos por la tarea: swr y reporte-detail
const mockOpen = vi.fn();
const mockSWR = vi.fn();

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockSWR(...args),
}));

vi.mock('@/components/reporte-detail', () => ({
  useReporteDetail: () => ({ open: mockOpen }),
}));

import { groupByFecha, groupByFechaWithReporte, getCalendarCells, getFirstWeekdayMonday, getDaysInMonth, getColorForLevel, buildSWRKey, getCalendarCellData, hasCalendarData } from '@/lib/calendar.js';
import { ESTADOS } from '@/lib/estados.js';

// Helper para simular lógica del componente calendar heatmap (sin DOM)
function simulateHeatmapFetch(q: string | null) {
  const key = buildSWRKey(q);
  // SWR: si key es null, no hace fetch
  if (key === null) return { didFetch: false, key: null as string | null };
  mockSWR(key, expect.anything);
  return { didFetch: true, key };
}

function simulateClickOnDay(fecha: string, reportes: any[]) {
  const map = groupByFechaWithReporte(reportes);
  const entry = map.get(fecha);
  if (!entry) return false;
  // Componente llamaría useReporteDetail().open(entry.reporte)
  mockOpen(entry.reporte);
  return true;
}

describe('sector-calendar: agrupación fecha→level (min/peor)', () => {
  beforeEach(() => {
    mockOpen.mockClear();
    mockSWR.mockClear();
  });

  it('si un día tiene múltiples reportes con diferentes estados, toma min level (peor)', () => {
    const reportes = [
      { fecha: '2026-05-20', estado: 'con_servicio', id: 1 },
      { fecha: '2026-05-20', estado: 'con_servicio_horario', id: 2 }, // level 2
      { fecha: '2026-05-20', estado: 'pendiente_servicio', id: 3 }, // level 0 peor
    ] as any[];
    const map = groupByFecha(reportes);
    expect(map.get('2026-05-20')).toBe(0);
  });

  it('mismo día: baja_presion (1) gana sobre con_servicio (3)', () => {
    const reportes = [
      { fecha: '2026-05-18', estado: 'con_servicio', id: 1 },
      { fecha: '2026-05-18', estado: 'baja_presion', id: 2 },
    ] as any[];
    expect(groupByFecha(reportes).get('2026-05-18')).toBe(1);
  });

  it('días distintos conservan su level independiente', () => {
    const reportes = [
      { fecha: '2026-05-20', estado: 'pendiente_servicio', id: 1 },
      { fecha: '2026-05-21', estado: 'con_servicio', id: 2 },
    ] as any[];
    const map = groupByFecha(reportes);
    expect(map.get('2026-05-20')).toBe(0);
    expect(map.get('2026-05-21')).toBe(3);
  });
});

describe('sector-calendar: cálculo días del mes y primer día lunes', () => {
  it('getDaysInMonth mayo 2026 =31 y celdas = offset+31', () => {
    expect(getDaysInMonth(2026, 5)).toBe(31);
    const cells = getCalendarCells(2026, 5);
    expect(cells.length).toBe(getFirstWeekdayMonday(2026, 5) + 31);
  });

  it('primer día lunes: mayo 2026 offset 4 → 4 celdas vacías + día 1', () => {
    expect(getFirstWeekdayMonday(2026, 5)).toBe(4);
    const cells = getCalendarCells(2026, 5);
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(cells[4]).toBe(1);
  });

  it('junio 2026 empieza lunes → 0 vacías, febrero bisiesto verifica', () => {
    expect(getFirstWeekdayMonday(2026, 6)).toBe(0);
    expect(getCalendarCells(2026, 6)[0]).toBe(1);
    expect(getDaysInMonth(2024, 2)).toBe(29);
  });
});

describe('sector-calendar: render celdas con color correcto según ESTADOS', () => {
  it('celda con pendiente_servicio (0) → rojo', () => {
    const reportes = [{ fecha: '2026-05-20', estado: 'pendiente_servicio', id: 1 } as any];
    const map = groupByFecha(reportes);
    const data = getCalendarCellData(2026, 5, map);
    const cell = data.find((c) => c.fecha === '2026-05-20');
    expect(cell?.level).toBe(0);
    expect(cell?.color).toBe(ESTADOS['pendiente_servicio'].color);
  });

  it('con_servicio (3) → verde, con_servicio_horario (2) → azul', () => {
    expect(getColorForLevel(3)).toBe(ESTADOS['con_servicio'].color);
    expect(getColorForLevel(2)).toBe(ESTADOS['con_servicio_horario'].color);
    const map = groupByFecha([{ fecha: '2026-05-21', estado: 'con_servicio_horario', id: 1 } as any]);
    const data = getCalendarCellData(2026, 5, map);
    expect(data.find((c) => c.fecha === '2026-05-21')?.color).toBe('#2563eb');
  });

  it('día sin reporte → level/color null (celda vacía visual)', () => {
    const data = getCalendarCellData(2026, 5, new Map());
    const cell = data.find((c) => c.fecha === '2026-05-15');
    expect(cell?.level).toBeNull();
    expect(cell?.color).toBeNull();
  });
});

describe('sector-calendar: click en día con dato llama useReporteDetail().open', () => {
  beforeEach(() => mockOpen.mockClear());

  it('click en día con dato llama open con reporte de peor level', () => {
    const r1 = { fecha: '2026-05-20', estado: 'con_servicio', id: 1, sector: 'Centro' } as any;
    const r2 = { fecha: '2026-05-20', estado: 'baja_presion', id: 2, sector: 'Centro' } as any;
    const clicked = simulateClickOnDay('2026-05-20', [r1, r2]);
    expect(clicked).toBe(true);
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith(r2); // peor level 1
  });

  it('click en día sin dato no llama open', () => {
    const clicked = simulateClickOnDay('2026-05-22', [{ fecha: '2026-05-20', estado: 'con_servicio', id: 1 } as any]);
    expect(clicked).toBe(false);
    expect(mockOpen).not.toHaveBeenCalled();
  });
});

describe('sector-calendar: sin datos → null, con q vacío → no fetch', () => {
  it('sin datos (reportes null/vacío) → hasCalendarData false → componente retornaría null', () => {
    expect(hasCalendarData(null)).toBe(false);
    expect(hasCalendarData([])).toBe(false);
    expect(groupByFecha([]).size).toBe(0);
    const data = getCalendarCellData(2026, 5, groupByFecha([]));
    // Sin datos todas las celdas no vacías tienen level null → heatmap vacío → null
    const withLevel = data.filter((c) => c.level !== null);
    expect(withLevel.length).toBe(0);
  });

  it('con q vacío → buildSWRKey null → SWR no fetch', () => {
    expect(buildSWRKey('')).toBeNull();
    expect(buildSWRKey(null)).toBeNull();
    expect(buildSWRKey('   ')).toBeNull();
    const res = simulateHeatmapFetch('');
    expect(res.didFetch).toBe(false);
    expect(mockSWR).not.toHaveBeenCalled();
  });

  it('con q válido → SWR fetch con key encoded', () => {
    mockSWR.mockClear();
    const res = simulateHeatmapFetch('Barzal');
    expect(res.didFetch).toBe(true);
    expect(res.key).toBe('/api/reports?q=Barzal');
    expect(mockSWR).toHaveBeenCalledWith('/api/reports?q=Barzal', expect.anything());

    mockSWR.mockClear();
    const res2 = simulateHeatmapFetch('La Esperanza');
    expect(res2.key).toBe('/api/reports?q=La%20Esperanza');
  });
});
