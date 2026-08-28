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
import { GET } from './route';

const mockedGetDbClient = vi.mocked(getDbClient);

describe('GET /api/sectores', () => {
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecute = vi.fn();
    mockedGetDbClient.mockReturnValue({ execute: mockExecute } as any);
    vi.clearAllMocks();
    mockedGetDbClient.mockReturnValue({ execute: mockExecute } as any);
  });

  it('retorna sectores con orden ASC y sql correcto', async () => {
    mockExecute.mockResolvedValue({
      rows: [
        { id: 2, nombre_sector: 'Barzal' },
        { id: 1, nombre_sector: 'Centro' },
      ],
    });

    const res = await GET();
    const data = (await res.json()) as any[];

    expect(data).toEqual([
      { id: 2, nombre_sector: 'Barzal' },
      { id: 1, nombre_sector: 'Centro' },
    ]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const call = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(call.sql).toContain('SELECT id, nombre_sector FROM sectores');
    expect(call.sql).toContain('ORDER BY nombre_sector ASC');
    expect(call.args).toEqual([]);
  });

  it('tabla vacía → []', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const res = await GET();
    const data = (await res.json()) as any[];
    expect(data).toEqual([]);
  });

  it('retorna 500 si hay error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExecute.mockRejectedValue(new Error('fail'));
    const res = await GET();
    expect(res.status).toBe(500);
    const data = (await res.json()) as any;
    expect(data).toEqual({ error: 'Error al obtener sectores' });
    spy.mockRestore();
  });
});
