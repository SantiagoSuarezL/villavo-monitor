'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';

interface Reporte {
  id: number;
  sector: string;
  estado: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  fecha: string;
  hora_monitoreo: string;
  barrios: string[];
}

function getBadgeStyles(estado: string) {
  switch (estado) {
    case 'con_servicio':
    case 'suministro_normal':
      return 'bg-[#dcfce7] text-[#16a34a]';
    case 'pendiente_servicio':
      return 'bg-[#fee2e2] text-[#dc2626]';
    case 'baja_presion':
    case 'llenado_presurizacion':
      return 'bg-[#fef9c3] text-[#ca8a04]';
    case 'con_servicio_horario':
      return 'bg-[#dbeafe] text-[#2563eb]';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getBadgeLabel(estado: string) {
  switch (estado) {
    case 'con_servicio':
      return 'Con servicio';
    case 'suministro_normal':
      return 'Suministro normal';
    case 'pendiente_servicio':
      return 'Pendiente de servicio';
    case 'baja_presion':
      return 'Baja presión';
    case 'llenado_presurizacion':
      return 'Llenado/Presurización';
    case 'con_servicio_horario':
      return 'Con servicio horario';
    default:
      return estado;
  }
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function extractTime(horaMonitoreo: string): string {
  if (!horaMonitoreo) return '';
  if (horaMonitoreo.includes('T')) {
    return horaMonitoreo.split('T')[1]?.split('.')[0]?.substring(0, 5) ?? '';
  }
  return horaMonitoreo.substring(0, 5);
}

const MAX_VISIBLE_BARRIOS = 3;

export function DataTable({ reportes: initialReportes, sectorId, q }: { reportes: Reporte[]; sectorId?: string | null; q?: string | null }) {
  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (sectorId) params.set('sector_id', sectorId);
    if (q) params.set('q', q);
    const qs = params.toString();
    return qs ? `/api/reports?${qs}` : '/api/reports';
  }, [sectorId, q]);

  const { data: reportes } = useSWR<Reporte[]>(
    swrKey,
    (url: string) => fetch(url).then((r) => r.json()),
    {
      fallbackData: initialReportes,
      refreshInterval: 300_000,
      revalidateOnFocus: false,
    }
  );

  const rows = reportes ?? initialReportes;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <DesktopTable rows={rows} />
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-[#e5e7eb]">
        {rows.map((row) => (
          <MobileCard key={row.id} row={row} />
        ))}
      </div>
    </>
  );
}

function DesktopTable({ rows }: { rows: Reporte[] }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <table className="w-full text-sm">
      <thead className="bg-[#f9fafb] text-[#6b7280] text-xs uppercase tracking-wider">
        <tr>
          <th className="px-4 py-3 text-left font-medium">Fecha</th>
          <th className="px-4 py-3 text-left font-medium">Sector</th>
          <th className="px-4 py-3 text-left font-medium">Estado</th>
          <th className="px-4 py-3 text-left font-medium">Barrios</th>
          <th className="px-4 py-3 text-left font-medium">Actualización</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#e5e7eb]">
        {rows.map((row) => {
          const expanded = expandedRows.has(row.id);
          const visibleBarrios = expanded ? row.barrios : row.barrios.slice(0, MAX_VISIBLE_BARRIOS);
          const hasMore = row.barrios.length > MAX_VISIBLE_BARRIOS;

          return (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-[#111827] whitespace-nowrap">
                {formatFecha(row.fecha)}
              </td>
              <td className="px-4 py-3 font-medium text-[#111827]">
                {row.sector}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeStyles(row.estado)}`}
                >
                  {getBadgeLabel(row.estado)}
                  {row.hora_inicio && row.hora_fin && (
                    <span className="ml-1">({row.hora_inicio} - {row.hora_fin})</span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-[#4d4d4d] max-w-xs">
                <div className="flex flex-wrap items-center gap-1">
                  {visibleBarrios.map((b, i) => (
                    <span key={i} className="text-[#4d4d4d]">
                      {b}{i < visibleBarrios.length - 1 ? ',' : ''}
                    </span>
                  ))}
                  {hasMore && !expanded && (
                    <button
                      onClick={() => toggleExpand(row.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      +{row.barrios.length - MAX_VISIBLE_BARRIOS} más
                    </button>
                  )}
                  {expanded && (
                    <button
                      onClick={() => toggleExpand(row.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      mostrar menos
                    </button>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-[#6b7280] text-xs whitespace-nowrap">
                {row.hora_monitoreo ? extractTime(row.hora_monitoreo) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MobileCard({ row }: { row: Reporte }) {
  const [expanded, setExpanded] = useState(false);
  const visibleBarrios = expanded ? row.barrios : row.barrios.slice(0, MAX_VISIBLE_BARRIOS);
  const hasMore = row.barrios.length > MAX_VISIBLE_BARRIOS;

  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeStyles(row.estado)}`}
        >
          {getBadgeLabel(row.estado)}
        </span>
        <span className="text-xs text-[#6b7280] whitespace-nowrap">
          {formatFecha(row.fecha)}
        </span>
      </div>
      <div className="font-medium text-[#111827] text-sm">{row.sector}</div>
      <div className="text-sm text-[#4d4d4d] leading-snug">
        {visibleBarrios.map((b, i) => (
          <span key={i}>
            {b}{i < visibleBarrios.length - 1 ? ', ' : ''}
          </span>
        ))}
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer ml-1"
          >
            +{row.barrios.length - MAX_VISIBLE_BARRIOS} más
          </button>
        )}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer ml-1"
          >
            mostrar menos
          </button>
        )}
      </div>
      <div className="text-xs text-[#6b7280]">
        {row.hora_monitoreo ? `Actualizado: ${extractTime(row.hora_monitoreo)}` : ''}
      </div>
    </div>
  );
}

export function DataTableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-[#e5e7eb]">
          <div className="h-4 bg-gray-200 rounded w-1/6" />
          <div className="h-4 bg-gray-200 rounded w-1/6" />
          <div className="h-4 bg-gray-200 rounded w-1/6" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/6" />
        </div>
      ))}
    </div>
  );
}

export type { Reporte };
