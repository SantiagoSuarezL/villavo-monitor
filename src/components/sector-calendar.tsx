'use client';

import React, { useMemo } from 'react';
import { ESTADOS, LEVEL_LABELS, formatMesAnio, formatFechaCorta } from '@/lib/estados';
import { useReporteDetail } from '@/components/reporte-detail';
import type { Reporte } from '@/lib/reporte';

interface ChartPoint {
  fecha: string;
  estado: string;
  level: number;
  color: string;
  label: string;
  reporte?: Reporte;
}

interface SectorCalendarProps {
  reportes: Reporte[];
  chartData?: ChartPoint[];
}

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

const LEVEL_ORDER = [3, 2, 1, 0] as const;

const LEVEL_META: Record<number, { label: string; color: string }> = {
  3: { label: LEVEL_LABELS[3], color: ESTADOS['con_servicio'].color },
  2: { label: LEVEL_LABELS[2], color: ESTADOS['con_servicio_horario'].color },
  1: { label: LEVEL_LABELS[1], color: ESTADOS['baja_presion'].color },
  0: { label: LEVEL_LABELS[0], color: ESTADOS['pendiente_servicio'].color },
};

export function SectorCalendar({ reportes, chartData: chartDataProp }: SectorCalendarProps) {
  const { open } = useReporteDetail();

  const { dayMap, mesAnio, year, month } = useMemo(() => {
    let map = new Map<string, ChartPoint>();
    let fechas: string[] = [];

    if (chartDataProp && chartDataProp.length > 0) {
      for (const p of chartDataProp) {
        map.set(p.fecha, p);
      }
      fechas = chartDataProp.map((p) => p.fecha);
    } else {
      // Build grouped by fecha with worst level (min)
      const seen = new Set<string>();
      const byDay = new Map<string, ChartPoint>();

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

      map = byDay;
      fechas = Array.from(byDay.keys()).sort((a, b) => a.localeCompare(b));
    }

    // Ensure map has reporte reference for click when built from chartDataProp
    if (chartDataProp && chartDataProp.length > 0) {
      for (const [fecha, point] of map.entries()) {
        if (!(point as ChartPoint).reporte) {
          const rep =
            reportes.find((r) => r.fecha === fecha && ESTADOS[r.estado]?.level === point.level) ??
            reportes.find((r) => r.fecha === fecha);
          if (rep) {
            (point as ChartPoint).reporte = rep;
          }
        }
      }
    }

    let y = 0;
    let m = 0;
    let mesAnioStr = '';
    if (fechas.length > 0) {
      mesAnioStr = formatMesAnio(fechas);
      const parts = fechas[0].split('-').map(Number);
      y = parts[0];
      m = parts[1];
    } else if (reportes.length > 0) {
      // fallback to first reporte fecha
      const first = reportes.find((r) => ESTADOS[r.estado]);
      if (first) {
        const parts = first.fecha.split('-').map(Number);
        y = parts[0];
        m = parts[1];
        mesAnioStr = formatMesAnio([first.fecha]);
      }
    }

    return { dayMap: map, mesAnio: mesAnioStr, year: y, month: m };
  }, [reportes, chartDataProp]);

  if (!year || !month) {
    return null;
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const leading = (firstDay + 6) % 7;

  return (
    <div>
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 font-mono text-[10px] uppercase tracking-widest text-mute"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9 w-9 sm:h-9 sm:w-9" aria-hidden />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const fecha = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const info = dayMap.get(fecha);

          if (info) {
            const reporte = (info as ChartPoint).reporte ?? reportes.find((r) => r.fecha === fecha);
            return (
              <button
                key={fecha}
                type="button"
                onClick={() => {
                  if (reporte) open(reporte);
                }}
                title={`${formatFechaCorta(fecha)} · ${info.label}`}
                aria-label={`${formatFechaCorta(fecha)}: ${info.label}`}
                className="flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-md border text-[11px] tabular-nums transition-colors hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-accent/40 sm:h-9 sm:w-9"
                style={{
                  backgroundColor: info.color + '18',
                  borderColor: info.color + '40',
                }}
              >
                <span className="font-mono text-[11px] tabular-nums leading-none text-ink">
                  {day}
                </span>
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: info.color }}
                  aria-hidden
                />
              </button>
            );
          }

          return (
            <div
              key={fecha}
              title="Sin datos"
              aria-label={`${day} sin datos`}
              className="flex h-9 w-9 flex-col items-center justify-center rounded-md border border-dashed border-line bg-paper-soft opacity-50 sm:h-9 sm:w-9"
            >
              <span className="font-mono text-[11px] tabular-nums leading-none text-mute">
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-wider text-mute">
        {LEVEL_ORDER.map((level) => {
          const meta = LEVEL_META[level];
          return (
            <span key={level} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden
              />
              {meta.label}
            </span>
          );
        })}
      </div>

      {/* Hidden mesAnio for accessibility / tests */}
      <span className="sr-only">{mesAnio}</span>
    </div>
  );
}

export default SectorCalendar;
