import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  try {
    const client = getDbClient();

    const result = await client.execute({
      sql: 'SELECT id, nombre_sector FROM sectores ORDER BY nombre_sector ASC',
      args: [],
    });

    const sectores = result.rows.map((row) => ({
      id: row.id,
      nombre_sector: row.nombre_sector,
    }));

    return NextResponse.json(sectores);
  } catch (error) {
    console.error('Error al obtener sectores:', error);
    return NextResponse.json({ error: 'Error al obtener sectores' }, { status: 500 });
  }
}
