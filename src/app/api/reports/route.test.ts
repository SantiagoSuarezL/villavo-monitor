import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  getDbClient: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status ?? 200,
      // para compatibilidad con Response
      headers: new Headers(),
    }),
  },
}));

import { getDbClient } from '@/lib/db';
import { GET } from './route';

const mockedGetDbClient = vi.mocked(getDbClient);

describe('GET /api/reports', () => {
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecute = vi.fn();
    mockedGetDbClient.mockReturnValue({ execute: mockExecute } as any);
    vi.clearAllMocks();
    mockedGetDbClient.mockReturnValue({ execute: mockExecute } as any);
  });

  it('sin params → 1 arg fechaDesde', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const req = new Request('http://localhost:3000/api/reports');
    const res = await GET(req);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(call.args).toHaveLength(1);
    expect(typeof call.args[0]).toBe('string');
    // fechaDesde debe ser YYYY-MM-DD
    expect(call.args[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(call.sql).toContain('WHERE rd.fecha >= ?');
    expect(call.sql).not.toContain('rd.sector_id = ?');
    expect(call.sql).not.toContain('LIKE ?');
  });

  it('solo sector_id → 2 args', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const req = new Request('http://localhost:3000/api/reports?sector_id=5');
    await GET(req);
    const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(call.args).toHaveLength(2);
    expect(call.args[1]).toBe(5);
    expect(call.sql).toContain('AND rd.sector_id = ?');
  });

  it('solo q → LIKE %Barzal%', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const req = new Request('http://localhost:3000/api/reports?q=Barzal');
    await GET(req);
    const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(call.args).toHaveLength(2);
    expect(call.args[1]).toBe('%Barzal%');
    expect(call.sql).toContain('b2.nombre_barrio LIKE ?');
    expect(call.sql).toContain('EXISTS');
  });

  it('ambos filtros sector_id y q → 3 args', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const req = new Request('http://localhost:3000/api/reports?sector_id=2&q=Barzal');
    await GET(req);
    const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(call.args).toHaveLength(3);
    expect(call.args[1]).toBe(2);
    expect(call.args[2]).toBe('%Barzal%');
    expect(call.sql).toContain('rd.sector_id = ?');
    expect(call.sql).toContain('LIKE ?');
  });

  it('barrios null → []', async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          id: 1,
          sector: 'Centro',
          estado: 'con_servicio',
          hora_inicio: null,
          hora_fin: null,
          fecha: '2026-05-20',
          hora_monitoreo: '2026-05-20 10:00:00',
          barrios: null,
        },
      ],
    });
    const req = new Request('http://localhost:3000/api/reports');
    const res = await GET(req);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
    expect(data[0].barrios).toEqual([]);
    expect(data[0].sector).toBe('Centro');
  });

  it('barrios string → split por ", "', async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          id: 2,
          sector: 'Barzal',
          estado: 'baja_presion',
          hora_inicio: null,
          hora_fin: null,
          fecha: '2026-05-20',
          hora_monitoreo: '2026-05-20 11:00:00',
          barrios: 'Barzal, Centro, Esperanza',
        },
      ],
    });
    const req = new Request('http://localhost:3000/api/reports');
    const res = await GET(req);
    const data = (await res.json()) as any[];
    expect(data[0].barrios).toEqual(['Barzal', 'Centro', 'Esperanza']);
  });

  it('ORDER BY fecha DESC, hora_monitoreo DESC', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const req = new Request('http://localhost:3000/api/reports');
    await GET(req);
    const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(call.sql).toContain('ORDER BY rd.fecha DESC, rd.hora_monitoreo DESC');
  });

  it('retorna 500 si hay error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExecute.mockRejectedValue(new Error('db fail'));
    const req = new Request('http://localhost:3000/api/reports');
    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = (await res.json()) as any;
    expect(data).toEqual({ error: 'Error al obtener reportes' });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('usa GROUP_CONCAT y GROUP BY', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const req = new Request('http://localhost:3000/api/reports');
    await GET(req);
    const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(call.sql).toContain('GROUP_CONCAT');
    expect(call.sql).toContain('GROUP BY rd.id');
  });
});
