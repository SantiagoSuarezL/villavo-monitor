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

interface Reporte {
  id: number;
  sector: string;
  estado: string;
  fecha: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ESTADO_LEVELS: Record<string, { level: number; color: string; label: string }> = {
  con_servicio: { level: 3, color: '#16a34a', label: 'Con servicio' },
  suministro_normal: { level: 3, color: '#16a34a', label: 'Suministro normal' },
  con_servicio_horario: { level: 2, color: '#2563eb', label: 'Con servicio horario' },
  baja_presion: { level: 1, color: '#ca8a04', label: 'Baja presión' },
  llenado_presurizacion: { level: 1, color: '#ca8a04', label: 'Llenado/Presurización' },
  pendiente_servicio: { level: 0, color: '#dc2626', label: 'Pendiente de servicio' },
};

const LEVEL_LABELS: Record<number, string> = {
  3: 'Con servicio',
  2: 'Con horario',
  1: 'Baja presión',
  0: 'Sin servicio',
};

function formatFechaChart(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function formatMesAnio(fechas: string[]): string {
  if (fechas.length === 0) return '';
  const [y, m] = fechas[0].split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

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
    <circle cx={cx} cy={cy} r={6} fill={payload.color} stroke="#fff" strokeWidth={2} />
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg shadow-sm px-3 py-2 text-sm">
      <div className="font-medium text-[#111827]">{p.fechaLabel}</div>
      <div className="text-[#4d4d4d]">{p.label}</div>
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
    <div className="bg-white rounded-lg border border-[#e5e7eb] p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-[#111827] mb-4">
        Historial de {q} — {mesAnio}
      </h3>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <XAxis
            dataKey="fechaLabel"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[-0.5, 3.5]}
            ticks={[0, 1, 2, 3]}
            tickFormatter={(v: number) => LEVEL_LABELS[v] ?? ''}
            tick={{ fontSize: 11, fill: '#6b7280' }}
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

      <div className="flex flex-wrap gap-3 mt-3 text-xs text-[#6b7280]">
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
