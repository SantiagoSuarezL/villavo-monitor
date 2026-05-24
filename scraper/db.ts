import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';

dotenv.config({ path: resolve(process.cwd(), '../.env') });

async function getDbClient() {
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
      );`
    },
    {
      name: 'barrios',
      sql: `CREATE TABLE IF NOT EXISTS barrios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_barrio TEXT NOT NULL,
        sector_id INTEGER,
        FOREIGN KEY (sector_id) REFERENCES sectores(id)
      );`
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
      );`
    },
    {
      name: 'reporte_barrios',
      sql: `CREATE TABLE IF NOT EXISTS reporte_barrios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporte_id INTEGER NOT NULL,
        barrio_id INTEGER NOT NULL,
        FOREIGN KEY (reporte_id) REFERENCES reportes_diarios(id),
        FOREIGN KEY (barrio_id) REFERENCES barrios(id)
      );`
    },
    {
      name: 'alias_normalizacion',
      sql: `CREATE TABLE IF NOT EXISTS alias_normalizacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alias_text TEXT UNIQUE NOT NULL,
        sector_id_referencia INTEGER NOT NULL,
        FOREIGN KEY (sector_id_referencia) REFERENCES sectores(id)
      );`
    }
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

// Run migration if called directly

migrate().catch(error => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error('Error en la migración:', msg);
  process.exit(1);
});

export { getDbClient, migrate };