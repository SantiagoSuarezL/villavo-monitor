import { describe, it, expect } from 'vitest';
import {
  getLevelForEstado,
  getColorForLevel,
  groupByFecha,
  groupByFechaWithReporte,
  getDaysInMonth,
  getFirstWeekdayMonday,
  getCalendarCells,
  getCalendarWeeks,
  buildSWRKey,
  shouldFetch,
  shouldShowHistoryChart,
  hasCalendarData,
  getCalendarCellData,
} from './calendar.js';
import { ESTADOS, ESTADO_FALLBACK } from './estados.js';

describe('calendar helpers - getLevelForEstado', () => {
  it('con_servicio → 3', () => expect(getLevelForEstado('con_servicio')).toBe(3));
  it('suministro_normal → 3', () => expect(getLevelForEstado('suministro_normal')).toBe(3));
  it('baja_presion → 1', () => expect(getLevelForEstado('baja_presion')).toBe(1));
  it('pendiente_servicio → 0', () => expect(getLevelForEstado('pendiente_servicio')).toBe(0));
  it('desconocido → -1', () => expect(getLevelForEstado('zzz')).toBe(-1));
});

describe('groupByFecha - peor level (min)', () => {
  it('vacío → map vacío', () => {
    expect(groupByFecha([]).size).toBe(0);
  });

  it('un día un reporte → level correcto', () => {
    const m = groupByFecha([{ fecha: '2026-05-20', estado: 'con_servicio', id: 1 } as any]);
    expect(m.get('2026-05-20')).toBe(3);
  });

  it('mismo día múltiples reportes toma min (peor)', () => {
    const reportes = [
      { fecha: '2026-05-20', estado: 'con_servicio', id: 1 },
      { fecha: '2026-05-20', estado: 'pendiente_servicio', id: 2 },
      { fecha: '2026-05-20', estado: 'baja_presion', id: 3 },
    ] as any[];
    const m = groupByFecha(reportes);
    expect(m.get('2026-05-20')).toBe(0); // min de 3,0,1
  });

  it('dos días distintos mantienen ambos', () => {
    const m = groupByFecha([
      { fecha: '2026-05-20', estado: 'con_servicio', id: 1 },
      { fecha: '2026-05-21', estado: 'baja_presion', id: 2 },
    ] as any[]);
    expect(m.get('2026-05-20')).toBe(3);
    expect(m.get('2026-05-21')).toBe(1);
    expect(m.size).toBe(2);
  });

  it('orden no importa, sigue min', () => {
    const m = groupByFecha([
      { fecha: '2026-05-10', estado: 'pendiente_servicio', id: 1 },
      { fecha: '2026-05-10', estado: 'con_servicio', id: 2 },
    ] as any[]);
    expect(m.get('2026-05-10')).toBe(0);
  });

  it('estado desconocido → -1 y gana como peor', () => {
    const m = groupByFecha([
      { fecha: '2026-05-20', estado: 'con_servicio', id: 1 },
      { fecha: '2026-05-20', estado: 'estado_inventado', id: 2 },
    ] as any[]);
    expect(m.get('2026-05-20')).toBe(-1);
  });

  it('ignora reportes sin fecha', () => {
    const m = groupByFecha([{ fecha: '', estado: 'con_servicio', id: 1 } as any]);
    expect(m.size).toBe(0);
  });
});

describe('groupByFechaWithReporte', () => {
  it('guarda reporte del peor level', () => {
    const r1 = { fecha: '2026-05-20', estado: 'con_servicio', id: 1, sector: 'A' } as any;
    const r2 = { fecha: '2026-05-20', estado: 'pendiente_servicio', id: 2, sector: 'A' } as any;
    const m = groupByFechaWithReporte([r1, r2]);
    expect(m.get('2026-05-20')?.level).toBe(0);
    expect(m.get('2026-05-20')?.reporte.id).toBe(2);
  });

  it('si empate conserva primero', () => {
    const r1 = { fecha: '2026-05-20', estado: 'baja_presion', id: 1 } as any;
    const r2 = { fecha: '2026-05-20', estado: 'llenado_presurizacion', id: 2 } as any; // ambos level 1
    const m = groupByFechaWithReporte([r1, r2]);
    expect(m.get('2026-05-20')?.reporte.id).toBe(1);
  });
});

describe('getDaysInMonth', () => {
  it('mayo 2026 → 31', () => expect(getDaysInMonth(2026, 5)).toBe(31));
  it('febrero 2024 bisiesto → 29', () => expect(getDaysInMonth(2024, 2)).toBe(29));
  it('febrero 2025 → 28', () => expect(getDaysInMonth(2025, 2)).toBe(28));
  it('abril → 30', () => expect(getDaysInMonth(2026, 4)).toBe(30));
  it('diciembre → 31', () => expect(getDaysInMonth(2026, 12)).toBe(31));
});

describe('getFirstWeekdayMonday', () => {
  it('2026-05-01 viernes → offset 4 (lun 0)', () => {
    // 1 mayo 2026 es viernes, lunes=0 → 4 vacías (lun-jue)
    expect(getFirstWeekdayMonday(2026, 5)).toBe(4);
  });
  it('2026-06-01 lunes → offset 0', () => {
    expect(getFirstWeekdayMonday(2026, 6)).toBe(0);
  });
  it('2026-03-01 domingo → offset 6', () => {
    expect(getFirstWeekdayMonday(2026, 3)).toBe(6);
  });
  it('2026-01-01 jueves → offset 3', () => {
    expect(getFirstWeekdayMonday(2026, 1)).toBe(3);
  });
});

describe('getCalendarCells', () => {
  it('mayo 2026: 4 vacías + 31 días = 35 celdas', () => {
    const cells = getCalendarCells(2026, 5);
    expect(cells.length).toBe(35);
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(cells[4]).toBe(1);
    expect(cells[cells.length - 1]).toBe(31);
  });

  it('junio 2026 lunes inicio: 0 vacías +30 =30', () => {
    const cells = getCalendarCells(2026, 6);
    expect(cells.length).toBe(30);
    expect(cells[0]).toBe(1);
    expect(cells[29]).toBe(30);
  });

  it('febrero 2026 (domingo inicio?) verifica vacías', () => {
    const cells = getCalendarCells(2026, 2);
    const offset = getFirstWeekdayMonday(2026, 2);
    expect(cells.slice(0, offset).every((c) => c === null)).toBe(true);
    expect(cells.length).toBe(offset + 28);
  });
});

describe('getCalendarWeeks', () => {
  it('semanas de 7', () => {
    const weeks = getCalendarWeeks(2026, 5);
    for (const w of weeks) {
      expect(w.length).toBeLessThanOrEqual(7);
    }
    // mayo 2026 35 celdas → 5 semanas de 7
    expect(weeks.length).toBe(5);
    expect(weeks[0].length).toBe(7);
  });
});

describe('getColorForLevel', () => {
  it('level 3 → verde', () => expect(getColorForLevel(3)).toBe(ESTADOS['con_servicio'].color));
  it('level 2 → azul', () => expect(getColorForLevel(2)).toBe(ESTADOS['con_servicio_horario'].color));
  it('level 1 → amarillo', () => expect(getColorForLevel(1)).toBe(ESTADOS['baja_presion'].color));
  it('level 0 → rojo', () => expect(getColorForLevel(0)).toBe(ESTADOS['pendiente_servicio'].color));
  it('level -1 → fallback gris', () => expect(getColorForLevel(-1)).toBe(ESTADO_FALLBACK.color));
  it('level desconocido → fallback', () => expect(getColorForLevel(99)).toBe(ESTADO_FALLBACK.color));
});

describe('buildSWRKey / shouldFetch', () => {
  it('q null → null', () => expect(buildSWRKey(null)).toBeNull());
  it('q undefined → null', () => expect(buildSWRKey(undefined)).toBeNull());
  it('q "" → null', () => expect(buildSWRKey('')).toBeNull());
  it('q "   " → null', () => expect(buildSWRKey('   ')).toBeNull());
  it('q "Barzal" → /api/reports?q=Barzal', () => expect(buildSWRKey('Barzal')).toBe('/api/reports?q=Barzal'));
  it('q con espacio → encoded', () => expect(buildSWRKey('La Esperanza')).toBe('/api/reports?q=La%20Esperanza'));
  it('trim', () => expect(buildSWRKey('  Barzal  ')).toBe('/api/reports?q=Barzal'));
  it('shouldFetch false si vacío', () => expect(shouldFetch('')).toBe(false));
  it('shouldFetch true si válido', () => expect(shouldFetch('q')).toBe(true));
});

describe('shouldShowHistoryChart', () => {
  it('null → false', () => expect(shouldShowHistoryChart(null)).toBe(false));
  it('"" → false', () => expect(shouldShowHistoryChart('')).toBe(false));
  it('"  " → false', () => expect(shouldShowHistoryChart('  ')).toBe(false));
  it('"Barzal" → true', () => expect(shouldShowHistoryChart('Barzal')).toBe(true));
});

describe('hasCalendarData', () => {
  it('null → false', () => expect(hasCalendarData(null)).toBe(false));
  it('[] → false', () => expect(hasCalendarData([])).toBe(false));
  it('[reporte] → true', () => expect(hasCalendarData([{ fecha: '2026-05-20', estado: 'con_servicio' } as any])).toBe(true));
});

describe('getCalendarCellData - integración color y fecha', () => {
  it('celda vacía tiene isEmpty true', () => {
    const data = getCalendarCellData(2026, 5, new Map());
    expect(data[0].isEmpty).toBe(true);
    expect(data[0].day).toBeNull();
  });

  it('día con dato tiene color correcto según level', () => {
    const map = new Map([['2026-05-20', 0]]);
    const data = getCalendarCellData(2026, 5, map);
    const cell = data.find((c) => c.fecha === '2026-05-20');
    expect(cell?.level).toBe(0);
    expect(cell?.color).toBe(ESTADOS['pendiente_servicio'].color);
  });

  it('día sin dato tiene level null y color null', () => {
    const data = getCalendarCellData(2026, 5, new Map());
    const cell = data.find((c) => c.fecha === '2026-05-15');
    expect(cell?.level).toBeNull();
    expect(cell?.color).toBeNull();
  });

  it('genera fecha ISO correcta con padding', () => {
    const data = getCalendarCellData(2026, 5, new Map());
    const cell1 = data.find((c) => c.day === 1);
    expect(cell1?.fecha).toBe('2026-05-01');
    const cell31 = data.find((c) => c.day === 31);
    expect(cell31?.fecha).toBe('2026-05-31');
  });

  it('integración groupByFecha → cellData: min level se refleja', () => {
    const reportes = [
      { fecha: '2026-05-10', estado: 'con_servicio', id: 1 },
      { fecha: '2026-05-10', estado: 'baja_presion', id: 2 },
    ] as any[];
    const map = groupByFecha(reportes);
    const data = getCalendarCellData(2026, 5, map);
    const cell = data.find((c) => c.fecha === '2026-05-10');
    expect(cell?.level).toBe(1);
    expect(cell?.color).toBe(ESTADOS['baja_presion'].color);
  });
});
