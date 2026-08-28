import { describe, it, expect } from 'vitest';
import { getEstado, ESTADOS, ESTADO_FALLBACK, LEVEL_LABELS, formatFechaCorta, formatMesAnio, formatFechaNumerica } from './estados.js';

describe('getEstado', () => {
  it('retorna con_servicio level 3', () => {
    const e = getEstado('con_servicio');
    expect(e.label).toBe('Con servicio');
    expect(e.level).toBe(3);
  });

  it('retorna suministro_normal level 3', () => {
    const e = getEstado('suministro_normal');
    expect(e.label).toBe('Suministro normal');
    expect(e.level).toBe(3);
  });

  it('retorna con_servicio_horario level 2', () => {
    const e = getEstado('con_servicio_horario');
    expect(e.label).toBe('Con servicio horario');
    expect(e.level).toBe(2);
  });

  it('retorna baja_presion level 1', () => {
    const e = getEstado('baja_presion');
    expect(e.label).toBe('Baja presión');
    expect(e.level).toBe(1);
  });

  it('retorna llenado_presurizacion level 1', () => {
    const e = getEstado('llenado_presurizacion');
    expect(e.label).toBe('Llenado/Presurización');
    expect(e.level).toBe(1);
  });

  it('retorna pendiente_servicio level 0', () => {
    const e = getEstado('pendiente_servicio');
    expect(e.label).toBe('Pendiente de servicio');
    expect(e.level).toBe(0);
  });

  it('fallback para estado desconocido level -1', () => {
    const e = getEstado('desconocido');
    expect(e).toEqual(ESTADO_FALLBACK);
    expect(e.level).toBe(-1);
    expect(e.label).toBe('Sin estado');
  });

  it('fallback para string vacío level -1', () => {
    expect(getEstado('').level).toBe(-1);
  });

  it('ESTADOS contiene 6 claves', () => {
    expect(Object.keys(ESTADOS)).toHaveLength(6);
  });
});

describe('formatFechaCorta', () => {
  it('2026-05-20 → 20 de may', () => {
    expect(formatFechaCorta('2026-05-20')).toBe('20 de may');
  });

  it('2026-01-05 → 5 de ene', () => {
    expect(formatFechaCorta('2026-01-05')).toBe('5 de ene');
  });

  it('2026-12-01 → 1 de dic', () => {
    expect(formatFechaCorta('2026-12-01')).toBe('1 de dic');
  });

  it('inválido retorna input', () => {
    expect(formatFechaCorta('invalido')).toBe('invalido');
  });

  it('fecha vacía retorna vacío', () => {
    expect(formatFechaCorta('')).toBe('');
  });

  it('fecha sin día retorna input', () => {
    expect(formatFechaCorta('2026-05')).toBe('2026-05');
  });
});

describe('formatMesAnio', () => {
  it("['2026-05-20'] → mayo de 2026", () => {
    expect(formatMesAnio(['2026-05-20'])).toBe('mayo de 2026');
  });

  it('usa primera fecha del array', () => {
    expect(formatMesAnio(['2026-03-15', '2026-05-20'])).toBe('marzo de 2026');
  });

  it('vacío → ""', () => {
    expect(formatMesAnio([])).toBe('');
  });

  it('fecha inválida → ""', () => {
    expect(formatMesAnio(['invalido'])).toBe('');
  });

  it('enero correctamente', () => {
    expect(formatMesAnio(['2026-01-10'])).toBe('enero de 2026');
  });
});

describe('formatFechaNumerica', () => {
  it('Date → 05/05/2026 (padStart)', () => {
    const d = new Date(2026, 4, 5); // month 4 => mayo
    expect(formatFechaNumerica(d)).toBe('05/05/2026');
  });

  it('01/01/2026 con ceros', () => {
    const d = new Date(2026, 0, 1);
    expect(formatFechaNumerica(d)).toBe('01/01/2026');
  });

  it('31/12/2026', () => {
    const d = new Date(2026, 11, 31);
    expect(formatFechaNumerica(d)).toBe('31/12/2026');
  });
});

describe('LEVEL_LABELS', () => {
  it('mapea 3 → Con servicio', () => {
    expect(LEVEL_LABELS[3]).toBe('Con servicio');
  });

  it('mapea 2 → Con horario', () => {
    expect(LEVEL_LABELS[2]).toBe('Con horario');
  });

  it('mapea 1 → Baja presión', () => {
    expect(LEVEL_LABELS[1]).toBe('Baja presión');
  });

  it('mapea 0 → Sin servicio', () => {
    expect(LEVEL_LABELS[0]).toBe('Sin servicio');
  });

  it('contiene 4 niveles', () => {
    expect(Object.keys(LEVEL_LABELS)).toHaveLength(4);
  });
});
