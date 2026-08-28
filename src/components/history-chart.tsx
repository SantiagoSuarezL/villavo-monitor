'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ESTADOS as ESTADO_LEVELS, LEVEL_LABELS, formatFechaCorta as formatFechaChart, formatMesAnio } from '@/lib/estados';

interface Reporte {
  id: number;
  sector: string;
  estado: string;
  fecha: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ChartPoint {
  fecha: string;
  fechaLabel: string;
  estado: string;
  level: number;
  color: string;
  label: string;
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle cx={cx} cy={cy} r={6} fill={payload.color} stroke="#faf8f3" strokeWidth={2} />
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-2 text-sm shadow-sm">
      <div className="font-mono text-xs tracking-tight text-ink">{p.fechaLabel}</div>
      <div className="text-body">{p.label}</div>
    </div>
  );
}

export function HistoryChart({ q }: { q: string }) {
  const { data: reportes } = useSWR<Reporte[]>(
    `/api/reports?q=${encodeURIComponent(q)}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const chartData: ChartPoint[] = useMemo(() => {
    if (!reportes || reportes.length === 0) return [];

    const seen = new Set<string>();
    const points: ChartPoint[] = [];

    for (const r of reportes) {
      const key = `${r.fecha}-${r.estado}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const info = ESTADO_LEVELS[r.estado];
      if (!info) continue;

      points.push({
        fecha: r.fecha,
        fechaLabel: formatFechaChart(r.fecha),
        estado: r.estado,
        level: info.level,
        color: info.color,
        label: info.label,
      });
    }

    points.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return points;
  }, [reportes]);

  if (!reportes || reportes.length === 0 || chartData.length === 0) return null;

  const mesAnio = formatMesAnio(chartData.map((p) => p.fecha));

  return (
    <div className="frame-brackets rounded-lg border border-line bg-paper p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-mute">
          Historial <span className="text-ink">// {q}</span>
        </h3>
        <span className="font-mono text-[10px] lowercase tracking-wider text-mute">{mesAnio}</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <XAxis
            dataKey="fechaLabel"
            tick={{ fontSize: 11, fill: '#8d8677' }}
            tickLine={false}
            axisLine={{ stroke: '#e5dfd0' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[-0.5, 3.5]}
            ticks={[0, 1, 2, 3]}
            tickFormatter={(v: number) => LEVEL_LABELS[v] ?? ''}
            tick={{ fontSize: 11, fill: '#8d8677' }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            dataKey="level"
            dot={<CustomDot />}
            stroke="transparent"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-wider text-mute">
        {Object.entries(ESTADO_LEVELS)
          .filter(([key]) => !key.includes('suministro_normal') && !key.includes('llenado'))
          .map(([key, val]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: val.color }}
              />
              {val.label}
            </span>
          ))}
      </div>
    </div>
  );
}
