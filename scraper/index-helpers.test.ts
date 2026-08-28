import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MESES, extractDateFromFileName, extractDayFromFilename, getCurrentMonthES } from './index.js';

describe('MESES', () => {
  it('contiene 12 meses', () => {
    expect(Object.keys(MESES)).toHaveLength(12);
  });

  it('mapea enero → 01 y diciembre → 12', () => {
    expect(MESES['enero']).toBe('01');
    expect(MESES['diciembre']).toBe('12');
  });

  it('mapea mayo → 05', () => {
    expect(MESES['mayo']).toBe('05');
  });
});

describe('extractDateFromFileName', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('SUMINISTRO DEL SERVICIO 05 DE MAYO → 2026-05-05', () => {
    const result = extractDateFromFileName('SUMINISTRO DEL SERVICIO 05 DE MAYO');
    expect(result).toBe('2026-05-05');
  });

  it('maneja mayúsculas y minúsculas', () => {
    const result = extractDateFromFileName('suministro del servicio 15 de enero');
    expect(result).toBe('2026-01-15');
  });

  it('extrae 31 DE DICIEMBRE → 2026-12-31', () => {
    const result = extractDateFromFileName('SUMINISTRO DEL SERVICIO 31 DE DICIEMBRE');
    expect(result).toBe('2026-12-31');
  });

  it('mes inválido fallback a fecha actual', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = extractDateFromFileName('SUMINISTRO DEL SERVICIO 05 DE INVALIDO');
    expect(result).toBe('2026-05-15');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Mes no reconocido'));
    warnSpy.mockRestore();
  });

  it('sin match fallback a fecha actual', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = extractDateFromFileName('archivo random sin fecha');
    expect(result).toBe('2026-05-15');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No se pudo extraer fecha'));
    warnSpy.mockRestore();
  });

  it('usa año actual del sistema', () => {
    vi.setSystemTime(new Date('2027-06-15T12:00:00Z'));
    const result = extractDateFromFileName('SUMINISTRO DEL SERVICIO 01 DE ENERO');
    expect(result).toBe('2027-01-01');
  });
});

describe('extractDayFromFilename', () => {
  it('05 → 5', () => {
    expect(extractDayFromFilename('SUMINISTRO DEL SERVICIO 05 DE MAYO')).toBe(5);
  });

  it('15 → 15', () => {
    expect(extractDayFromFilename('SUMINISTRO DEL SERVICIO 15 DE JUNIO')).toBe(15);
  });

  it('sin match → 99', () => {
    expect(extractDayFromFilename('archivo sin dia')).toBe(99);
  });

  it('01 con espacios → 1', () => {
    expect(extractDayFromFilename('SUMINISTRO DEL SERVICIO 01 DE ENERO')).toBe(1);
  });

  it('case insensitive DE', () => {
    expect(extractDayFromFilename('suministro del servicio 09 de mayo')).toBe(9);
  });
});

describe('getCurrentMonthES', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna ENERO para enero', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15'));
    expect(getCurrentMonthES()).toBe('ENERO');
  });

  it('retorna MAYO para mayo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10'));
    expect(getCurrentMonthES()).toBe('MAYO');
  });

  it('retorna DICIEMBRE para diciembre', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-15T12:00:00Z'));
    expect(getCurrentMonthES()).toBe('DICIEMBRE');
  });

  it('retorna mes en mayúsculas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20'));
    const result = getCurrentMonthES();
    expect(result).toBe(result.toUpperCase());
    expect(result).toBe('JULIO');
  });
});
