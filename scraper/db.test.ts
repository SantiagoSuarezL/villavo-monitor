import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@libsql/client';

vi.mock('@libsql/client', () => ({
  createClient: vi.fn(),
}));

import {
  getDbClient,
  upsertSector,
  upsertBarrio,
  insertReporte,
  getProcessedDates,
  cleanOldData,
  deleteReporteBarrios,
  insertReporteBarrios,
} from './db.js';

const mockedCreateClient = vi.mocked(createClient);
let mockExecute: ReturnType<typeof vi.fn>;
let mockClose: ReturnType<typeof vi.fn>;

describe('scraper/db.ts', () => {
  beforeEach(() => {
    mockExecute = vi.fn();
    mockClose = vi.fn();
    mockedCreateClient.mockReturnValue({ execute: mockExecute, close: mockClose } as any);
    process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io';
    process.env.TURSO_AUTH_TOKEN = 'test-token';
    vi.clearAllMocks();
    // re-setup after clear
    mockedCreateClient.mockReturnValue({ execute: mockExecute, close: mockClose } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('getDbClient', () => {
    it('throws si falta TURSO_DATABASE_URL', async () => {
      delete process.env.TURSO_DATABASE_URL;
      await expect(getDbClient()).rejects.toThrow(
        'TURSO_DATABASE_URL environment variable is required',
      );
      expect(mockedCreateClient).not.toHaveBeenCalled();
    });

    it('throws si falta TURSO_AUTH_TOKEN', async () => {
      delete process.env.TURSO_AUTH_TOKEN;
      await expect(getDbClient()).rejects.toThrow(
        'TURSO_AUTH_TOKEN environment variable is required',
      );
      expect(mockedCreateClient).not.toHaveBeenCalled();
    });

    it('retorna cliente si ambas variables existen', async () => {
      const client = await getDbClient();
      expect(mockedCreateClient).toHaveBeenCalledWith({
        url: 'libsql://test.turso.io',
        authToken: 'test-token',
      });
      expect(client).toEqual({ execute: mockExecute, close: mockClose });
    });

    it('pasa url y authToken correctos a createClient', async () => {
      process.env.TURSO_DATABASE_URL = 'libsql://custom.turso.io';
      process.env.TURSO_AUTH_TOKEN = 'custom-token';
      await getDbClient();
      expect(mockedCreateClient).toHaveBeenCalledWith({
        url: 'libsql://custom.turso.io',
        authToken: 'custom-token',
      });
    });
  });

  describe('upsertSector', () => {
    it('sector existe + alias nuevo → inserta alias', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // SELECT sector
        .mockResolvedValueOnce({ rows: [] }) // SELECT alias
        .mockResolvedValueOnce({ rows: [] }); // INSERT alias

      const id = await upsertSector('Centro', 'CeN');
      expect(id).toBe(5);
      expect(mockExecute).toHaveBeenCalledTimes(3);
      expect(mockExecute.mock.calls[0][0]).toEqual({
        sql: 'SELECT id FROM sectores WHERE nombre_sector = ?',
        args: ['Centro'],
      });
      expect(mockExecute.mock.calls[1][0]).toEqual({
        sql: 'SELECT id FROM alias_normalizacion WHERE alias_text = ?',
        args: ['CeN'],
      });
      expect(mockExecute.mock.calls[2][0]).toEqual({
        sql: 'INSERT INTO alias_normalizacion (alias_text, sector_id_referencia) VALUES (?, ?)',
        args: ['CeN', 5],
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('sector existe + alias ya existe → no inserta alias', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }); // alias ya existe

      const id = await upsertSector('Barzal', 'BarzalAlias');
      expect(id).toBe(3);
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('sector existe sin alias param → no toca alias', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: 7 }] });
      const id = await upsertSector('Esperanza');
      expect(id).toBe(7);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('nuevo sector sin alias → inserta sector', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] }) // no existe
        .mockResolvedValueOnce({ rows: [], lastInsertRowid: 10 }); // INSERT

      const id = await upsertSector('NuevoSector');
      expect(id).toBe(10);
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute.mock.calls[1][0]).toEqual({
        sql: 'INSERT INTO sectores (nombre_sector) VALUES (?)',
        args: ['NuevoSector'],
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('nuevo sector con alias → inserta sector y alias', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], lastInsertRowid: 12 })
        .mockResolvedValueOnce({ rows: [] }); // INSERT alias

      const id = await upsertSector('OtroSector', 'AliasX');
      expect(id).toBe(12);
      expect(mockExecute).toHaveBeenCalledTimes(3);
      expect(mockExecute.mock.calls[2][0]).toEqual({
        sql: 'INSERT INTO alias_normalizacion (alias_text, sector_id_referencia) VALUES (?, ?)',
        args: ['AliasX', 12],
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertBarrio', () => {
    it('barrio existe → retorna id sin insertar', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: 20 }] });
      const id = await upsertBarrio('Barzal', 5);
      expect(id).toBe(20);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute.mock.calls[0][0]).toEqual({
        sql: 'SELECT id FROM barrios WHERE nombre_barrio = ? AND sector_id = ?',
        args: ['Barzal', 5],
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('barrio no existe → inserta y retorna nuevo id', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], lastInsertRowid: 33 });

      const id = await upsertBarrio('NuevoBarrio', 5);
      expect(id).toBe(33);
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute.mock.calls[1][0]).toEqual({
        sql: 'INSERT INTO barrios (nombre_barrio, sector_id) VALUES (?, ?)',
        args: ['NuevoBarrio', 5],
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('insertReporte', () => {
    it('inserta con ON CONFLICT DO UPDATE y retorna id', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] }) // INSERT
        .mockResolvedValueOnce({ rows: [{ id: 42 }] }); // SELECT

      const id = await insertReporte({
        sector_id: 1,
        estado: 'con_servicio',
        hora_inicio: '08:00',
        hora_fin: '12:00',
        fecha: '2026-05-20',
      });

      expect(id).toBe(42);
      expect(mockExecute).toHaveBeenCalledTimes(2);
      const firstCall = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
      expect(firstCall.sql).toContain('ON CONFLICT(sector_id, fecha)');
      expect(firstCall.sql).toContain('DO UPDATE SET');
      expect(firstCall.args).toEqual([1, 'con_servicio', '08:00', '12:00', '2026-05-20']);
      expect(mockExecute.mock.calls[1][0]).toEqual({
        sql: 'SELECT id FROM reportes_diarios WHERE sector_id = ? AND fecha = ?',
        args: [1, '2026-05-20'],
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('usa null si hora_inicio/hora_fin no se proveen', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 7 }] });

      await insertReporte({
        sector_id: 2,
        estado: 'pendiente_servicio',
        fecha: '2026-05-21',
      });

      const firstArgs = (mockExecute.mock.calls[0][0] as any).args;
      expect(firstArgs).toEqual([2, 'pendiente_servicio', null, null, '2026-05-21']);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProcessedDates', () => {
    it('usa prefijo del mes actual 2026-05% y retorna Set', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));

      mockExecute.mockResolvedValueOnce({
        rows: [{ fecha: '2026-05-01' }, { fecha: '2026-05-15' }, { fecha: '2026-05-20' }],
      });

      const result = await getProcessedDates();

      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(new Set(['2026-05-01', '2026-05-15', '2026-05-20']));
      expect(mockExecute).toHaveBeenCalledTimes(1);
      const callArg = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
      expect(callArg.sql).toContain('WHERE fecha LIKE ?');
      expect(callArg.args).toEqual(['2026-05%']);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanOldData', () => {
    it('count 0 → no hace deletes', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockExecute.mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await cleanOldData();

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const firstArg = mockExecute.mock.calls[0][0] as string;
      expect(firstArg).toContain("SELECT COUNT(*)");
      expect(logSpy).toHaveBeenCalledWith('✓ Limpieza: no hay datos viejos que borrar');
      expect(mockClose).toHaveBeenCalledTimes(1);
      logSpy.mockRestore();
    });

    it('count >0 → hace 2 deletes con date(now,-90 days)', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockExecute
        .mockResolvedValueOnce({ rows: [{ count: 5 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await cleanOldData();

      expect(mockExecute).toHaveBeenCalledTimes(3);
      const secondArg = mockExecute.mock.calls[1][0] as string;
      const thirdArg = mockExecute.mock.calls[2][0] as string;
      expect(secondArg).toContain('DELETE FROM reporte_barrios');
      expect(secondArg).toContain("date('now', '-90 days')");
      expect(thirdArg).toContain('DELETE FROM reportes_diarios');
      expect(thirdArg).toContain("date('now', '-90 days')");
      expect(logSpy).toHaveBeenCalledWith('✓ Limpieza: 5 reportes viejos eliminados (>90 días)');
      expect(mockClose).toHaveBeenCalledTimes(1);
      logSpy.mockRestore();
    });
  });

  describe('deleteReporteBarrios', () => {
    it('borra por reporte_id', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      await deleteReporteBarrios(123);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute.mock.calls[0][0]).toEqual({
        sql: 'DELETE FROM reporte_barrios WHERE reporte_id = ?',
        args: [123],
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('insertReporteBarrios', () => {
    it('bulk insert con placeholders y args', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      await insertReporteBarrios(10, [2, 3, 4]);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
      expect(call.sql).toContain('INSERT INTO reporte_barrios (reporte_id, barrio_id) VALUES');
      expect(call.sql).toContain('(?, ?), (?, ?), (?, ?)');
      expect(call.args).toEqual([10, 2, 10, 3, 10, 4]);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('array vacío → no llama a db', async () => {
      await insertReporteBarrios(10, []);
      expect(mockedCreateClient).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockClose).not.toHaveBeenCalled();
    });

    it('un solo barrio → un placeholder', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      await insertReporteBarrios(5, [99]);
      const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
      expect(call.sql).toContain('VALUES (?, ?)');
      expect(call.args).toEqual([5, 99]);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('db.close() en finally', () => {
    it('se llama incluso si execute falla', async () => {
      mockExecute.mockRejectedValue(new Error('db error'));
      await expect(upsertBarrio('X', 1)).rejects.toThrow('db error');
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('se llama en upsertSector cuando hay error', async () => {
      mockExecute.mockRejectedValue(new Error('fail sector'));
      await expect(upsertSector('S', 'alias')).rejects.toThrow('fail sector');
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('se llama en insertReporte cuando hay error', async () => {
      mockExecute.mockRejectedValue(new Error('fail reporte'));
      await expect(
        insertReporte({ sector_id: 1, estado: 'con_servicio', fecha: '2026-05-20' }),
      ).rejects.toThrow('fail reporte');
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
