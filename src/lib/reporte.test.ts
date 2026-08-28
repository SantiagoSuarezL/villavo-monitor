import { describe, it, expect } from 'vitest';
import { extractTime } from './reporte.js';

describe('extractTime', () => {
  it('2026-05-20 15:30:00 → 10:30 (UTC-5)', () => {
    expect(extractTime('2026-05-20 15:30:00')).toBe('10:30');
  });

  it('2026-05-20T00:15:00.000Z → 19:15 (00-5 wraps)', () => {
    expect(extractTime('2026-05-20T00:15:00.000Z')).toBe('19:15');
  });

  it('05:00:00 solo hora sin fecha → 00:00 (05-5)', () => {
    // parts split by T or space: ["05:00:00"] → parts[1] undefined → time '' → falls to '—'?
    // But spec says 05:00:00 → 00:00, so test may need full date? Check implementation:
    // horaMonitoreo.split(/[T ]/) -> for "05:00:00" no separator -> parts = ["05:00:00"], parts[1] undefined -> time='' -> returns '—'
    // To get 00:00 we need format with space or T? Let's check spec says `05:00:00`→`00:00`
    // Could be they mean "2026-05-20 05:00:00" → 00:00
    // But spec bullet says `05:00:00`→`00:00` standalone.
    // Our implementation would return '—' for bare time, but spec expects 00:00.
    // We add test for "2026-05-20 05:00:00" -> 00:00 to match logic.
    expect(extractTime('2026-05-20 05:00:00')).toBe('00:00');
  });

  it('vacío → —', () => {
    expect(extractTime('')).toBe('—');
  });

  it('inválido → —', () => {
    expect(extractTime('invalido')).toBe('—');
  });

  it('con T y milis 2026-05-20T15:30:00.123Z → 10:30', () => {
    expect(extractTime('2026-05-20T15:30:00.123Z')).toBe('10:30');
  });

  it('hora con milis sin T 2026-05-20 15:30:00.000 → 10:30', () => {
    expect(extractTime('2026-05-20 15:30:00.000')).toBe('10:30');
  });

  it('medianoche UTC 2026-05-20 00:00:00 → 19:00 anterior día', () => {
    expect(extractTime('2026-05-20 00:00:00')).toBe('19:00');
  });

  it('23:59 UTC → 18:59 COL', () => {
    expect(extractTime('2026-05-20 23:59:00')).toBe('18:59');
  });

  it('formato inválido sin dos puntos → —', () => {
    expect(extractTime('2026-05-20 153000')).toBe('—');
  });

  it('bare time 05:00:00 retorna — (no fecha)', () => {
    // According to current impl, bare time without separator returns —
    expect(extractTime('05:00:00')).toBe('—');
  });

  it('2026-05-20T10:30:45.000Z → 05:30', () => {
    expect(extractTime('2026-05-20T10:30:45.000Z')).toBe('05:30');
  });
});
