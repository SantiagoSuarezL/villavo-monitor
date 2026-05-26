import { getDbClient } from './db.js';

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

    const dupCount = await db.execute(
      `SELECT COUNT(*) - COUNT(DISTINCT sector_id || '-' || fecha) AS dups FROM reportes_diarios`,
    );
    const numDups = Number(dupCount.rows[0]?.dups ?? 0);
    if (numDups > 0) {
      console.log(`⚠ Limpiando ${numDups} duplicados en reportes_diarios...`);
      await db.execute(
        `DELETE FROM reporte_barrios WHERE reporte_id NOT IN (SELECT MIN(id) FROM reportes_diarios GROUP BY sector_id, fecha)`,
      );
      await db.execute(
        `DELETE FROM reportes_diarios WHERE id NOT IN (SELECT MIN(id) FROM reportes_diarios GROUP BY sector_id, fecha)`,
      );
      console.log('✓ Duplicados eliminados');
    }

    await db.execute(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_reporte_unico ON reportes_diarios(sector_id, fecha)',
    );
    console.log('✓ Índice único creado: reportes_diarios(sector_id, fecha)');
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
