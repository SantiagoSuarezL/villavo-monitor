import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
import type { EstadoServicio } from './parser.js';

dotenv.config({ path: resolve(process.cwd(), '../.env') });

export async function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is required');
  }

  if (!authToken) {
    throw new Error('TURSO_AUTH_TOKEN environment variable is required');
  }

  return createClient({ url, authToken });
}

export async function upsertSector(nombreSector: string, alias?: string): Promise<number> {
  const db = await getDbClient();
  try {
    const existing = await db.execute({
      sql: 'SELECT id FROM sectores WHERE nombre_sector = ?',
      args: [nombreSector],
    });

    if (existing.rows.length > 0) {
      const id = Number(existing.rows[0].id);

      if (alias) {
        const existingAlias = await db.execute({
          sql: 'SELECT id FROM alias_normalizacion WHERE alias_text = ?',
          args: [alias],
        });
        if (existingAlias.rows.length === 0) {
          await db.execute({
            sql: 'INSERT INTO alias_normalizacion (alias_text, sector_id_referencia) VALUES (?, ?)',
            args: [alias, id],
          });
        }
      }

      return id;
    }

    const result = await db.execute({
      sql: 'INSERT INTO sectores (nombre_sector) VALUES (?)',
      args: [nombreSector],
    });
    const id = Number(result.lastInsertRowid);

    if (alias) {
      await db.execute({
        sql: 'INSERT INTO alias_normalizacion (alias_text, sector_id_referencia) VALUES (?, ?)',
        args: [alias, id],
      });
    }

    return id;
  } finally {
    db.close();
  }
}

export async function upsertBarrio(nombreBarrio: string, sectorId: number): Promise<number> {
  const db = await getDbClient();
  try {
    const existing = await db.execute({
      sql: 'SELECT id FROM barrios WHERE nombre_barrio = ? AND sector_id = ?',
      args: [nombreBarrio, sectorId],
    });

    if (existing.rows.length > 0) {
      return Number(existing.rows[0].id);
    }

    const result = await db.execute({
      sql: 'INSERT INTO barrios (nombre_barrio, sector_id) VALUES (?, ?)',
      args: [nombreBarrio, sectorId],
    });

    return Number(result.lastInsertRowid);
  } finally {
    db.close();
  }
}

export async function insertReporte(data: {
  sector_id: number;
  estado: EstadoServicio;
  hora_inicio?: string;
  hora_fin?: string;
  fecha: string;
}): Promise<number> {
  const db = await getDbClient();
  try {
    await db.execute({
      sql: `INSERT INTO reportes_diarios (sector_id, estado, hora_inicio, hora_fin, fecha)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(sector_id, fecha)
            DO UPDATE SET estado = excluded.estado,
                          hora_inicio = excluded.hora_inicio,
                          hora_fin = excluded.hora_fin`,
      args: [data.sector_id, data.estado, data.hora_inicio ?? null, data.hora_fin ?? null, data.fecha],
    });

    const result = await db.execute({
      sql: 'SELECT id FROM reportes_diarios WHERE sector_id = ? AND fecha = ?',
      args: [data.sector_id, data.fecha],
    });

    return Number(result.rows[0].id);
  } finally {
    db.close();
  }
}

export async function getProcessedDates(): Promise<Set<string>> {
  const db = await getDbClient();
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${month}`;

    const result = await db.execute({
      sql: 'SELECT DISTINCT fecha FROM reportes_diarios WHERE fecha LIKE ? ORDER BY fecha ASC',
      args: [`${prefix}%`],
    });
    return new Set(result.rows.map(row => String(row.fecha)));
  } finally {
    db.close();
  }
}

export async function cleanOldData(): Promise<void> {
  const db = await getDbClient();
  try {
    const result = await db.execute(
      `SELECT COUNT(*) as count FROM reportes_diarios 
       WHERE fecha < date('now', '-90 days')`
    );
    const count = Number(result.rows[0].count);

    if (count === 0) {
      console.log('✓ Limpieza: no hay datos viejos que borrar');
      return;
    }

    await db.execute(
      `DELETE FROM reporte_barrios WHERE reporte_id IN (
        SELECT id FROM reportes_diarios WHERE fecha < date('now', '-90 days')
      )`
    );
    await db.execute(
      `DELETE FROM reportes_diarios WHERE fecha < date('now', '-90 days')`
    );

    console.log(`✓ Limpieza: ${count} reportes viejos eliminados (>90 días)`);
  } finally {
    db.close();
  }
}

export async function deleteReporteBarrios(reporteId: number): Promise<void> {
  const db = await getDbClient();
  try {
    await db.execute({
      sql: 'DELETE FROM reporte_barrios WHERE reporte_id = ?',
      args: [reporteId],
    });
  } finally {
    db.close();
  }
}

export async function insertReporteBarrios(reporteId: number, barrioIds: number[]): Promise<void> {
  if (barrioIds.length === 0) return;
  const db = await getDbClient();
  try {
    const placeholders = barrioIds.map(() => '(?, ?)').join(', ');
    const args: (string | number)[] = [];
    for (const barrioId of barrioIds) {
      args.push(reporteId, barrioId);
    }
    await db.execute({
      sql: `INSERT INTO reporte_barrios (reporte_id, barrio_id) VALUES ${placeholders}`,
      args,
    });
  } finally {
    db.close();
  }
}
