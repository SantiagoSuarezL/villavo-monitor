'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Reporte } from '@/lib/reporte';
import { extractTime } from '@/lib/reporte';
import { getEstado, formatFechaCorta } from '@/lib/estados';
import { Modal } from '@/components/modal';
import { useEstadoGlossary } from '@/components/estado-glossary';

interface ReporteDetailContextValue {
  open: (reporte: Reporte) => void;
}

const ReporteDetailContext = createContext<ReporteDetailContextValue>({ open: () => {} });

export function useReporteDetail() {
  return useContext(ReporteDetailContext);
}

export function ReporteDetailProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Reporte | null>(null);

  const open = useCallback((reporte: Reporte) => setSelected(reporte), []);
  const close = useCallback(() => setSelected(null), []);

  return (
    <ReporteDetailContext.Provider value={{ open }}>
      {children}
      {selected && <ReporteDetailModal reporte={selected} onClose={close} />}
    </ReporteDetailContext.Provider>
  );
}

function ReporteDetailModal({ reporte, onClose }: { reporte: Reporte; onClose: () => void }) {
  const glossary = useEstadoGlossary();
  const info = getEstado(reporte.estado);
  const tieneHorario = reporte.hora_inicio && reporte.hora_fin;

  return (
    <Modal subtitle="Detalle del reporte" title={reporte.sector} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm tracking-tight text-ink">
          {formatFechaCorta(reporte.fecha)}
        </span>
        <span className="text-mute">·</span>
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${info.badgeClass}`}>
          {info.label}
        </span>
      </div>

      <dl className="mt-4 divide-y divide-line rounded-lg border border-line bg-paper-soft px-3">
        {tieneHorario && (
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-mute">Horario</dt>
            <dd className="font-mono text-xs tabular-nums text-ink">
              {reporte.hora_inicio} – {reporte.hora_fin}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-mute">
            Última actualización
          </dt>
          <dd className="font-mono text-xs tabular-nums text-ink">
            {extractTime(reporte.hora_monitoreo)} (hora CO)
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg border border-line bg-paper p-3">
        <p className="text-sm leading-relaxed text-body">{info.description}</p>
        <button
          type="button"
          onClick={() => {
            onClose();
            glossary.open(reporte.estado);
          }}
          className="mt-2 cursor-pointer font-mono text-[10px] uppercase tracking-wider text-accent hover:text-accent-deep"
        >
          ¿Qué significa este estado? →
        </button>
      </div>

      <div className="mt-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-mute">
          Barrios reportados <span className="text-ink">({reporte.barrios.length})</span>
        </p>
        {reporte.barrios.length === 0 ? (
          <p className="text-sm text-mute">Este reporte no especifica barrios.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {reporte.barrios.map((b, i) => (
              <li
                key={i}
                className="truncate rounded-md border border-line bg-paper-soft px-2 py-1.5 text-xs text-body"
                title={b}
              >
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
