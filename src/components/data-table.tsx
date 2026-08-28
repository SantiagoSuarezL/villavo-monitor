'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ESTADO_FALLBACK, getEstado, formatFechaCorta } from '@/lib/estados';
import type { Reporte } from '@/lib/reporte';
import { extractTime } from '@/lib/reporte';
import { useEstadoGlossary } from '@/components/estado-glossary';
import { useReporteDetail } from '@/components/reporte-detail';

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

  const fechas = useMemo(() => {
    const set = new Set(rows.map((r) => r.fecha));
    return Array.from(set).sort().reverse();
  }, [rows]);

  const lastFecha = fechas[0] ?? null;
  const [fechaSel, setFechaSel] = useState<string>('latest');
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleRows = useMemo(() => {
    if (q) return rows;
    if (fechaSel === 'all') return rows;
    const fecha = fechaSel === 'latest' ? lastFecha : fechaSel;
    return rows.filter((r) => r.fecha === fecha);
  }, [rows, q, fechaSel, lastFecha]);

  const fechaLabel =
    fechaSel === 'all'
      ? 'Todos los días'
      : formatFechaCorta(fechaSel === 'latest' ? (lastFecha ?? '') : fechaSel);

  const pickFecha = (value: string) => {
    setFechaSel(value);
    setMenuOpen(false);
  };

  return (
    <>
      {/* Date bar */}
      {q ? (
        <div className="rounded-t-[7px] border-b border-line bg-paper-soft px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-mute">
          Histórico · últimos 30 días <span className="text-ink">// {q}</span>
        </div>
      ) : (
        <div className="relative flex items-center justify-between gap-3 rounded-t-[7px] border-b border-line bg-paper-soft px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-mute">
            {fechaSel === 'latest' ? 'Último reporte' : 'Reportes'}
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-paper px-2.5 py-1 font-mono text-[11px] tracking-tight text-ink transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
            >
              {fechaLabel}
              <svg
                className={`size-3 text-mute transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                <ul
                  role="listbox"
                  className="dropdown-menu absolute right-0 z-20 mt-1 max-h-64 w-44 overflow-y-auto rounded-lg border border-line bg-paper p-1 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_1px_-0.5px_rgba(0,0,0,0.06),0px_3px_3px_-1.5px_rgba(0,0,0,0.06),0px_6px_6px_-3px_rgba(0,0,0,0.06)]"
                >
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={fechaSel === 'latest'}
                      onClick={() => pickFecha('latest')}
                      className={`w-full rounded-md px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-paper-soft ${
                        fechaSel === 'latest' ? 'text-accent' : 'text-body'
                      }`}
                    >
                      Último reporte
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={fechaSel === 'all'}
                      onClick={() => pickFecha('all')}
                      className={`w-full rounded-md px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-paper-soft ${
                        fechaSel === 'all' ? 'text-accent' : 'text-body'
                      }`}
                    >
                      Ver todos
                    </button>
                  </li>
                  <li className="my-1 border-t border-line" role="separator" />
                  {fechas.map((f) => (
                    <li key={f}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={fechaSel === f}
                        onClick={() => pickFecha(f)}
                        className={`w-full rounded-md px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-paper-soft ${
                          fechaSel === f ? 'text-accent' : 'text-body'
                        }`}
                      >
                        {formatFechaCorta(f)}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {visibleRows.length === 0 && (
        <div className="px-4 py-10 text-center font-mono text-xs uppercase tracking-widest text-mute">
          Sin reportes
        </div>
      )}

      {/* Desktop table */}
      {visibleRows.length > 0 && (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <DesktopTable rows={visibleRows} />
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-line sm:hidden">
            {visibleRows.map((row) => (
              <MobileCard key={row.id} row={row} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function EstadoBadge({ estado, horario }: { estado: string; horario?: string }) {
  const { open } = useEstadoGlossary();
  const info = getEstado(estado);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        open(info === ESTADO_FALLBACK ? undefined : estado);
      }}
      title={info.description}
      className={`inline-flex cursor-pointer items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-accent/60 ${info.badgeClass}`}
    >
      {info.label}
      {horario && <span className="ml-1.5 font-mono text-[10px] tabular-nums opacity-80">{horario}</span>}
    </button>
  );
}

function BarriosList({ barrios }: { barrios: string[] }) {
  const visible = barrios.slice(0, MAX_VISIBLE_BARRIOS);
  const extra = barrios.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((b, i) => (
        <span key={i} className="text-body">
          {b}{i < visible.length - 1 ? ',' : ''}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-xs font-medium text-accent">+{extra} más</span>
      )}
    </div>
  );
}

function DesktopTable({ rows }: { rows: Reporte[] }) {
  const { open } = useReporteDetail();

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-line bg-paper-soft font-mono text-[10px] uppercase tracking-widest text-mute">
        <tr>
          <th className="px-4 py-3 text-left font-medium">Fecha</th>
          <th className="px-4 py-3 text-left font-medium">Sector</th>
          <th className="px-4 py-3 text-left font-medium">Estado</th>
          <th className="px-4 py-3 text-left font-medium">Barrios</th>
          <th className="px-4 py-3 text-left font-medium">Act.</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((row) => {
          const horario =
            row.hora_inicio && row.hora_fin ? `${row.hora_inicio}–${row.hora_fin}` : undefined;

          return (
            <tr
              key={row.id}
              tabIndex={0}
              aria-label={`Ver detalle de ${row.sector}`}
              onClick={() => open(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') open(row);
              }}
              className="cursor-pointer border-b border-line/70 transition-colors last:border-b-0 hover:bg-paper-soft/60 focus:bg-paper-soft/60 focus:outline-none"
            >
              <td className="px-4 py-3 font-mono text-xs tracking-tight text-ink whitespace-nowrap tabular-nums">
                {formatFechaCorta(row.fecha)}
              </td>
              <td className="px-4 py-3 font-medium text-ink">
                {row.sector}
              </td>
              <td className="px-4 py-3">
                <EstadoBadge estado={row.estado} horario={horario} />
              </td>
              <td className="px-4 py-3 text-body max-w-xs">
                <BarriosList barrios={row.barrios} />
              </td>
              <td className="px-4 py-3 font-mono text-xs tabular-nums text-mute whitespace-nowrap">
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
  const { open } = useReporteDetail();
  const horario =
    row.hora_inicio && row.hora_fin ? `${row.hora_inicio}–${row.hora_fin}` : undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ver detalle de ${row.sector}`}
      onClick={() => open(row)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open(row);
      }}
      className="space-y-1.5 px-4 py-3 transition-colors active:bg-paper-soft/60"
    >
      <div className="flex items-start justify-between gap-2">
        <EstadoBadge estado={row.estado} horario={horario} />
        <span className="font-mono text-xs tabular-nums text-mute whitespace-nowrap">
          {formatFechaCorta(row.fecha)}
        </span>
      </div>
      <div className="font-medium text-sm text-ink">{row.sector}</div>
      <BarriosList barrios={row.barrios} />
      <div className="font-mono text-[10px] uppercase tracking-wider text-mute">
        {row.hora_monitoreo ? `Act. ${extractTime(row.hora_monitoreo)}` : ''}
      </div>
    </div>
  );
}

export function DataTableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-line p-4">
          <div className="h-4 bg-paper-deep rounded w-1/6" />
          <div className="h-4 bg-paper-deep rounded w-1/6" />
          <div className="h-4 bg-paper-deep rounded w-1/6" />
          <div className="h-4 bg-paper-deep rounded w-1/3" />
          <div className="h-4 bg-paper-deep rounded w-1/6" />
        </div>
      ))}
    </div>
  );
}

export type { Reporte };
