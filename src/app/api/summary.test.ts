import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  getDbClient: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status ?? 200,
      headers: new Headers(),
    }),
  },
}));

import { getDbClient } from '@/lib/db';
import { GET } from './summary/route';

const mockedGetDbClient = vi.mocked(getDbClient);

describe('GET /api/summary', () => {
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecute = vi.fn();
    mockedGetDbClient.mockReturnValue({ execute: mockExecute } as any);
    vi.clearAllMocks();
    mockedGetDbClient.mockReturnValue({ execute: mockExecute } as any);
  });

  it('agregación correcta mapea campos', async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          fecha: '2026-05-20',
          total_sectores: 10,
          con_servicio: 6,
          sin_servicio: 2,
          baja_presion: 2,
          ultima_actualizacion: '2026-05-20 10:00:00',
        },
      ],
    });

    const res = await GET();
    const data = (await res.json()) as any;

    expect(data).toEqual({
      fecha: '2026-05-20',
      total_sectores: 10,
      con_servicio: 6,
      sin_servicio: 2,
      baja_presion: 2,
      ultima_actualizacion: '2026-05-20 10:00:00',
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('tabla vacía → rows vacíos → 0/null', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const res = await GET();
    const data = (await res.json()) as any;
    expect(data).toEqual({
      fecha: null,
      total_sectores: 0,
      con_servicio: 0,
      sin_servicio: 0,
      baja_presion: 0,
      ultima_actualizacion: null,
    });
  });

  it('fila con nulls → 0/null', async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          fecha: null,
          total_sectores: null,
          con_servicio: null,
          sin_servicio: null,
          baja_presion: null,
          ultima_actualizacion: null,
        },
      ],
    });
    const res = await GET();
    const data = (await res.json()) as any;
    expect(data).toEqual({
      fecha: null,
      total_sectores: 0,
      con_servicio: 0,
      sin_servicio: 0,
      baja_presion: 0,
      ultima_actualizacion: null,
    });
  });

  it('sql contiene agregaciones SUM CASE y MAX(fecha)', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    await GET();
    const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(call.sql).toContain('MAX(fecha)');
    expect(call.sql).toContain("SUM(CASE WHEN estado = 'con_servicio'");
    expect(call.sql).toContain("SUM(CASE WHEN estado = 'pendiente_servicio'");
    expect(call.sql).toContain("SUM(CASE WHEN estado = 'baja_presion'");
    expect(call.sql).toContain('WHERE fecha = (SELECT MAX(fecha)');
  });

  it('retorna 500 si hay error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExecute.mockRejectedValue(new Error('fail'));
    const res = await GET();
    expect(res.status).toBe(500);
    const data = (await res.json()) as any;
    expect(data).toEqual({ error: 'Error al obtener resumen' });
    spy.mockRestore();
  });

  it('convierte strings numéricos a Number', async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          fecha: '2026-05-20',
          total_sectores: '5',
          con_servicio: '3',
          sin_servicio: '1',
          baja_presion: '1',
          ultima_actualizacion: '2026-05-20 09:00:00',
        },
      ],
    });
    const res = await GET();
    const data = (await res.json()) as any;
    expect(data.total_sectores).toBe(5);
    expect(data.con_servicio).toBe(3);
    expect(typeof data.total_sectores).toBe('number');
  });
});
