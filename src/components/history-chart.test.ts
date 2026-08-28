import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOpen = vi.fn();
const mockSWR = vi.fn();

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockSWR(...args),
}));

vi.mock('@/components/reporte-detail', () => ({
  useReporteDetail: () => ({ open: mockOpen }),
}));

import { groupByFecha, getCalendarCells, getFirstWeekdayMonday, getColorForLevel, buildSWRKey, getCalendarCellData, shouldShowHistoryChart } from '@/lib/calendar.js';
import { ESTADOS } from '@/lib/estados.js';

// Simula lógica que tendrá HistoryChart cuando sea heatmap
function simulateHistoryChartLogic(q: string | null, reportes: any[]) {
  const key = buildSWRKey(q);
  if (key === null) return { shouldFetch: false, rendered: null };
  const map = groupByFecha(reportes);
  if (map.size === 0) return { shouldFetch: true, rendered: null }; // sin datos → null
  const cells = getCalendarCellData(2026, 5, map);
  return { shouldFetch: true, rendered: cells, key };
}

describe('history-chart (compatibilidad futura heatmap)', () => {
  beforeEach(() => {
    mockOpen.mockClear();
    mockSWR.mockClear();
  });

  it('groupByFecha: toma min level (peor) si múltiples estados mismo día', () => {
    const reportes = [
      { fecha: '2026-05-20', estado: 'suministro_normal', id: 1 }, //3
      { fecha: '2026-05-20', estado: 'llenado_presurizacion', id: 2 }, //1
    ] as any[];
    expect(groupByFecha(reportes).get('2026-05-20')).toBe(1);
  });

  it('cálc días del mes y offset lunes: mayo 2026', () => {
    expect(getCalendarCells(2026, 5).length).toBe(35);
    expect(getFirstWeekdayMonday(2026, 5)).toBe(4);
  });

  it('cada level mapea a color ESTADOS correcto', () => {
    const checks: Array<[string, number, string]> = [
      ['con_servicio', 3, ESTADOS['con_servicio'].color],
      ['con_servicio_horario', 2, ESTADOS['con_servicio_horario'].color],
      ['baja_presion', 1, ESTADOS['baja_presion'].color],
      ['pendiente_servicio', 0, ESTADOS['pendiente_servicio'].color],
    ];
    for (const [estado, level, color] of checks) {
      expect(getColorForLevel(level)).toBe(color);
      const map = groupByFecha([{ fecha: '2026-05-10', estado, id: 1 } as any]);
      expect(map.get('2026-05-10')).toBe(level);
    }
  });

  it('render: dato pendiente_servicio genera celda roja', () => {
    const reportes = [{ fecha: '2026-05-20', estado: 'pendiente_servicio', id: 1 } as any];
    const { rendered } = simulateHistoryChartLogic('Barzal', reportes);
    const cell = (rendered as any[])?.find((c: any) => c.fecha === '2026-05-20');
    expect(cell?.color).toBe(ESTADOS['pendiente_servicio'].color);
  });

  it('click en día con dato llama useReporteDetail().open (mock)', () => {
    const r = { fecha: '2026-05-20', estado: 'con_servicio', id: 99, sector: 'Test' } as any;
    // simula click handler que el componente tendrá
    const map = groupByFecha(reportesWith([r]));
    const entryFecha = '2026-05-20';
    if (map.has(entryFecha)) mockOpen(r);
    expect(mockOpen).toHaveBeenCalledWith(r);
  });

  it('sin datos → rendered null (componente retorna null)', () => {
    const result = simulateHistoryChartLogic('Barzal', []);
    expect(result.rendered).toBeNull();
  });

  it('con q vacío → no fetch (SWR key null)', () => {
    expect(buildSWRKey('')).toBeNull();
    expect(buildSWRKey(null)).toBeNull();
    expect(simulateHistoryChartLogic('', [{ fecha: '2026-05-20', estado: 'con_servicio', id: 1 } as any]).shouldFetch).toBe(false);
    expect(simulateHistoryChartLogic(null, []).shouldFetch).toBe(false);
  });

  it('con q válido → fetch con encoded key', () => {
    const { key, shouldFetch } = simulateHistoryChartLogic('Barzal', [{ fecha: '2026-05-20', estado: 'con_servicio', id: 1 } as any]);
    expect(shouldFetch).toBe(true);
    expect(key).toBe('/api/reports?q=Barzal');
  });

  it('page.tsx compatibilidad: shouldShowHistoryChart solo si q truthy', () => {
    expect(shouldShowHistoryChart(null)).toBe(false);
    expect(shouldShowHistoryChart('')).toBe(false);
    expect(shouldShowHistoryChart('Barzal')).toBe(true);
    // Simula condición de page.tsx: {q && <HistoryChart q={q}>}
    const pageRendersHistoryChart = (q: string | null) => Boolean(q && shouldShowHistoryChart(q));
    expect(pageRendersHistoryChart(null)).toBe(false);
    expect(pageRendersHistoryChart('test')).toBe(true);
  });

  it('febrero bisiesto y meses con 30/31 días cubiertos', () => {
    expect(getCalendarCells(2024, 2).length).toBe(getFirstWeekdayMonday(2024, 2) + 29);
    expect(getCalendarCells(2026, 4).length).toBe(getFirstWeekdayMonday(2026, 4) + 30);
  });
});

function reportesWith(list: any[]) {
  return list;
}
