'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { ESTADOS, formatMesAnio } from '@/lib/estados';
import { SectorCalendar } from '@/components/sector-calendar';
import type { Reporte } from '@/lib/reporte';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ChartPoint {
  fecha: string;
  estado: string;
  level: number;
  color: string;
  label: string;
  reporte?: Reporte;
}

export function HistoryChart({ q }: { q: string }) {
  const swrKey = q && q.trim() ? `/api/reports?q=${encodeURIComponent(q.trim())}` : null;
  const { data: reportes } = useSWR<Reporte[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
  });

  const chartData: ChartPoint[] = useMemo(() => {
    if (!reportes || reportes.length === 0) return [];

    const seen = new Set<string>();
    const byDay = new Map<string, ChartPoint & { reporte: Reporte }>();

    for (const r of reportes) {
      const key = `${r.fecha}-${r.estado}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const info = ESTADOS[r.estado];
      if (!info) continue;

      const existing = byDay.get(r.fecha);
      if (!existing || info.level < existing.level) {
        byDay.set(r.fecha, {
          fecha: r.fecha,
          estado: r.estado,
          level: info.level,
          color: info.color,
          label: info.label,
          reporte: r,
        });
      }
    }

    const points = Array.from(byDay.values()).sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    );

    return points;
  }, [reportes]);

  if (!reportes || chartData.length === 0) return null;

  const mesAnio = formatMesAnio(chartData.map((p) => p.fecha));

  return (
    <div className="frame-brackets rounded-lg border border-line bg-paper p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-mute">
          Historial <span className="text-ink">// {q}</span>
        </h3>
        <span className="font-mono text-[10px] lowercase tracking-wider text-mute">
          {mesAnio}
        </span>
      </div>

      <SectorCalendar reportes={reportes} chartData={chartData} />
    </div>
  );
}
