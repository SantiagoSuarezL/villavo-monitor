import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sectorIdParam = searchParams.get('sector_id');
    const sectorId = sectorIdParam ? Number(sectorIdParam) : null;
    const q = searchParams.get('q');

    const client = getDbClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fechaDesde = thirtyDaysAgo.toISOString().split('T')[0];

    let sql = `
      SELECT 
        rd.id,
        s.nombre_sector AS sector,
        rd.estado,
        rd.hora_inicio,
        rd.hora_fin,
        rd.fecha,
        rd.hora_monitoreo,
        GROUP_CONCAT(b.nombre_barrio, ', ') AS barrios
      FROM reportes_diarios rd
      JOIN sectores s ON rd.sector_id = s.id
      LEFT JOIN reporte_barrios rb ON rd.id = rb.reporte_id
      LEFT JOIN barrios b ON rb.barrio_id = b.id
      WHERE rd.fecha >= ?
      ${sectorId ? 'AND rd.sector_id = ?' : ''}
      ${q ? `AND EXISTS (SELECT 1 FROM reporte_barrios rb2 JOIN barrios b2 ON rb2.barrio_id = b2.id WHERE rb2.reporte_id = rd.id AND b2.nombre_barrio LIKE ?)` : ''}
      GROUP BY rd.id, s.nombre_sector, rd.estado, rd.hora_inicio, rd.hora_fin, rd.fecha, rd.hora_monitoreo
      ORDER BY rd.fecha DESC, rd.hora_monitoreo DESC
    `;
    const args: (string | number)[] = [fechaDesde];
    if (sectorId !== null) args.push(sectorId);
    if (q) args.push(`%${q}%`);

    const result = await client.execute({ sql, args });

    const data = result.rows.map((row) => ({
      id: row.id,
      sector: row.sector,
      estado: row.estado,
      hora_inicio: row.hora_inicio,
      hora_fin: row.hora_fin,
      fecha: row.fecha,
      hora_monitoreo: row.hora_monitoreo,
      barrios: row.barrios ? String(row.barrios).split(', ') : [],
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    return NextResponse.json({ error: 'Error al obtener reportes' }, { status: 500 });
  }
}
