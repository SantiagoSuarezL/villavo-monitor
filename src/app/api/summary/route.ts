import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  try {
    const client = getDbClient();

    const result = await client.execute({
      sql: `
        SELECT
          MAX(fecha) as fecha,
          COUNT(*) as total_sectores,
          SUM(CASE WHEN estado = 'con_servicio' OR estado = 'suministro_normal' OR estado = 'con_servicio_horario' THEN 1 ELSE 0 END) as con_servicio,
          SUM(CASE WHEN estado = 'pendiente_servicio' THEN 1 ELSE 0 END) as sin_servicio,
          SUM(CASE WHEN estado = 'baja_presion' OR estado = 'llenado_presurizacion' THEN 1 ELSE 0 END) as baja_presion,
          (SELECT MAX(hora_monitoreo) FROM reportes_diarios) as ultima_actualizacion
        FROM reportes_diarios
        WHERE fecha = (SELECT MAX(fecha) FROM reportes_diarios)
      `,
      args: [],
    });

    const row = result.rows[0];

    const summary = {
      fecha: row?.fecha ?? null,
      total_sectores: Number(row?.total_sectores ?? 0),
      con_servicio: Number(row?.con_servicio ?? 0),
      sin_servicio: Number(row?.sin_servicio ?? 0),
      baja_presion: Number(row?.baja_presion ?? 0),
      ultima_actualizacion: row?.ultima_actualizacion ?? null,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    return NextResponse.json({ error: 'Error al obtener resumen' }, { status: 500 });
  }
}
