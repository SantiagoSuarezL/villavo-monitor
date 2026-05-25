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
    const result = await db.execute({
      sql: 'INSERT INTO reportes_diarios (sector_id, estado, hora_inicio, hora_fin, fecha) VALUES (?, ?, ?, ?, ?)',
      args: [data.sector_id, data.estado, data.hora_inicio ?? null, data.hora_fin ?? null, data.fecha],
    });
    return Number(result.lastInsertRowid);
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

async function migrate() {
  let db;
  try {
    db = await getDbClient();
    console.log('✓ Conexión Turso exitosa');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('✗ Error al conectar a Turso:', msg);
    process.exit(1);
  }

  const tables = [
    {
      name: 'sectores',
      sql: `CREATE TABLE IF NOT EXISTS sectores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_sector TEXT UNIQUE NOT NULL
      );`,
    },
    {
      name: 'barrios',
      sql: `CREATE TABLE IF NOT EXISTS barrios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_barrio TEXT NOT NULL,
        sector_id INTEGER,
        FOREIGN KEY (sector_id) REFERENCES sectores(id)
      );`,
    },
    {
      name: 'reportes_diarios',
      sql: `CREATE TABLE IF NOT EXISTS reportes_diarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sector_id INTEGER NOT NULL,
        estado TEXT NOT NULL,
        hora_inicio TEXT,
        hora_fin TEXT,
        fecha DATE NOT NULL,
        hora_monitoreo DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sector_id) REFERENCES sectores(id)
      );`,
    },
    {
      name: 'reporte_barrios',
      sql: `CREATE TABLE IF NOT EXISTS reporte_barrios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporte_id INTEGER NOT NULL,
        barrio_id INTEGER NOT NULL,
        FOREIGN KEY (reporte_id) REFERENCES reportes_diarios(id),
        FOREIGN KEY (barrio_id) REFERENCES barrios(id)
      );`,
    },
    {
      name: 'alias_normalizacion',
      sql: `CREATE TABLE IF NOT EXISTS alias_normalizacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alias_text TEXT UNIQUE NOT NULL,
        sector_id_referencia INTEGER NOT NULL,
        FOREIGN KEY (sector_id_referencia) REFERENCES sectores(id)
      );`,
    },
  ];

  try {
    for (const table of tables) {
      await db.execute(table.sql);
      console.log(`✓ Tabla ${table.name} creada`);
    }

    console.log('✓ Tablas creadas: sectores, barrios, reportes_diarios, reporte_barrios, alias_normalizacion');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('✗ Error al crear tablas:', msg);
    process.exit(1);
  } finally {
    await db.close();
  }
}

migrate().catch(error => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error('Error en la migración:', msg);
  process.exit(1);
});

export { migrate };
