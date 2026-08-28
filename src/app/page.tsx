import React, { Suspense } from 'react';
import { DataTable, DataTableSkeleton, Reporte } from '@/components/data-table';
import { SectoresFilter } from '@/components/sectores-filter';
import { SearchBar } from '@/components/search-bar';
import { SWRProvider } from '@/components/swr-provider';
import { SummaryCards } from '@/components/summary-cards';
import { UpdateChip } from '@/components/update-chip';
import { HistoryChart } from '@/components/history-chart';
import { CornerSquares } from '@/components/corner-squares';
import { Reveal } from '@/components/reveal';
import { EstadoGlossaryProvider, EstadoGlossaryButton } from '@/components/estado-glossary';
import { ReporteDetailProvider } from '@/components/reporte-detail';
import { NavPendingProvider, PendingOverlay } from '@/components/nav-pending';
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
      <div className="min-h-screen bg-field field-texture p-[6px]">
        <main className="relative min-h-[calc(100vh-12px)] w-full rounded-xl border border-black/50 bg-paper paper-texture shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <CornerSquares />

          <header className="sticky top-0 z-40 overflow-hidden rounded-t-xl border-b border-line">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-paper via-paper/80 to-paper/40" />
            <div aria-hidden className="header-blur pointer-events-none absolute inset-0">
              <div /><div /><div /><div /><div />
            </div>
            <div className="relative z-10 mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
                  EAAV · Villavicencio — Suministro de agua
                </p>
                <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-ink">
                  Monitoreo en Villavo
                </h1>
              </div>
              <Suspense fallback={null}>
                <UpdateChip />
              </Suspense>
            </div>
          </header>

          <NavPendingProvider>
          <EstadoGlossaryProvider>
          <ReporteDetailProvider>
          <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 pb-6 pt-5 sm:space-y-5 sm:px-6">
            <Suspense fallback={
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border border-line bg-paper rounded-lg p-4 animate-pulse">
                    <div className="h-3 w-8 bg-paper-deep rounded mb-3" />
                    <div className="h-8 bg-paper-deep rounded w-14 mb-1.5" />
                    <div className="h-3 bg-paper-deep rounded w-24" />
                  </div>
                ))}
              </div>
            }>
              <SummaryCards />
            </Suspense>

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 rounded-lg border border-line bg-paper p-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
                <span className="hidden font-mono text-[10px] uppercase tracking-widest text-mute sm:inline">
                  Buscar
                </span>
                <Suspense fallback={<div className="h-9 flex-1 bg-paper-deep rounded animate-pulse" />}>
                  <SearchBar currentQ={q} />
                </Suspense>
              </div>
              <div className="hidden sm:mx-2 sm:block sm:h-6 sm:w-px sm:bg-line" />
              <Suspense fallback={<div className="h-9 w-full sm:w-52 bg-paper-deep rounded animate-pulse" />}>
                <SectoresFilter currentSectorId={sectorId} />
              </Suspense>
              <div className="hidden sm:mx-2 sm:block sm:h-6 sm:w-px sm:bg-line" />
              <div className="sm:pl-2">
                <EstadoGlossaryButton />
              </div>
            </div>

            <PendingOverlay>
              {q && (
                <Suspense fallback={<div className="h-48 bg-paper border border-line rounded-lg animate-pulse" />}>
                  <HistoryChart q={q} />
                </Suspense>
              )}

              <Reveal>
                <div className="relative rounded-lg border border-line bg-paper">
                  <CornerSquares />
                  <Suspense fallback={<DataTableSkeleton />}>
                    <DataTable reportes={reportes} sectorId={sectorId} q={q} />
                  </Suspense>
                </div>
              </Reveal>
            </PendingOverlay>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-widest text-mute">
              <span>Fuente: EAAV — reportes oficiales de suministro</span>
              <span>Actualización automática · 8:00 / 14:00 CO</span>
            </footer>
          </div>
          </ReporteDetailProvider>
          </EstadoGlossaryProvider>
          </NavPendingProvider>
        </main>
      </div>
    </SWRProvider>
  );
}
