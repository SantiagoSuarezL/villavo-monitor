import React, { Suspense } from 'react';
import { DataTable, DataTableSkeleton, Reporte } from '@/components/data-table';
import { SectoresFilter } from '@/components/sectores-filter';
import { SearchBar } from '@/components/search-bar';
import { SWRProvider } from '@/components/swr-provider';
import { SummaryCards } from '@/components/summary-cards';
import { UpdateChip } from '@/components/update-chip';
import { HistoryChart } from '@/components/history-chart';
import { getDbClient } from '@/lib/db';

async function getReportes(sectorId: string | null, q: string | null): Promise<Reporte[]> {
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
  if (sectorId !== null) args.push(Number(sectorId));
  if (q) args.push(`%${q}%`);

  const result = await client.execute({ sql, args });

  return result.rows.map((row) => ({
    id: Number(row.id),
    sector: String(row.sector),
    estado: String(row.estado),
    hora_inicio: row.hora_inicio ? String(row.hora_inicio) : null,
    hora_fin: row.hora_fin ? String(row.hora_fin) : null,
    fecha: String(row.fecha),
    hora_monitoreo: String(row.hora_monitoreo ?? ''),
    barrios: row.barrios ? String(row.barrios).split(', ') : [],
  }));
}

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sector_id?: string; q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const sectorId = params.sector_id ?? null;
  const q = params.q ?? null;

  const reportes = await getReportes(sectorId, q);

  return (
    <SWRProvider>
      <main className="min-h-screen bg-[#f9fafb]">
        <header className="sticky top-0 z-10 bg-white border-b border-[#e5e7eb]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#111827]">Villavo Monitor</h1>
              <p className="text-xs text-[#6b7280] hidden sm:block">Estado del suministro de agua · EAAV Villavicencio</p>
            </div>
            <Suspense fallback={null}>
              <UpdateChip />
            </Suspense>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Suspense fallback={
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-[#e5e7eb] p-4 animate-pulse">
                  <div className="h-8 w-8 bg-gray-200 rounded mb-2" />
                  <div className="h-7 bg-gray-200 rounded w-16 mb-1" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
              ))}
            </div>
          }>
            <SummaryCards />
          </Suspense>

          <div className="flex flex-col sm:flex-row gap-3">
            <Suspense fallback={<div className="h-9 flex-1 bg-gray-200 rounded animate-pulse" />}>
              <SearchBar currentQ={q} />
            </Suspense>
            <Suspense fallback={<div className="h-9 w-full sm:w-48 bg-gray-200 rounded animate-pulse" />}>
              <SectoresFilter currentSectorId={sectorId} />
            </Suspense>
          </div>

          {q && (
            <Suspense fallback={<div className="h-48 bg-white rounded-lg border border-[#e5e7eb] animate-pulse" />}>
              <HistoryChart q={q} />
            </Suspense>
          )}

          <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
            <Suspense fallback={<DataTableSkeleton />}>
              <DataTable reportes={reportes} sectorId={sectorId} q={q} />
            </Suspense>
          </div>
        </div>
      </main>
    </SWRProvider>
  );
}
