'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleShare = useCallback(async () => {
    const horario = reporte.hora_inicio && reporte.hora_fin ? `${reporte.hora_inicio} – ${reporte.hora_fin}` : null;
    const parts = [`${reporte.sector}: ${info.label}`];
    if (horario) parts.push(horario);
    parts.push(formatFechaCorta(reporte.fecha));
    const text = parts.join(' — ') + ' · Villavo Monitor';
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = `Villavo Monitor - ${reporte.sector}`;

    try {
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && (!nav.canShare || nav.canShare({ text, url }))) {
        await nav.share({ title, text, url });
        return;
      }
    } catch {
      // fallback to clipboard
    }

    const doCopyToast = () => {
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        doCopyToast();
        return;
      } catch {
        // fallback to prompt
      }
    }

    // último fallback
    window.prompt('Copia este enlace:', url);
  }, [reporte.sector, reporte.hora_inicio, reporte.hora_fin, reporte.fecha, info.label]);

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

      <div className="relative mt-5 flex justify-end border-t border-line pt-4">
        <button
          type="button"
          onClick={handleShare}
          aria-label="Compartir reporte"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 font-mono text-xs text-ink transition-colors hover:border-accent hover:text-accent"
        >
          <svg
            className="size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Compartir reporte
        </button>
        {copied && (
          <div className="absolute bottom-full right-0 mb-2 rounded-md border border-line bg-paper-soft px-3 py-1.5 font-mono text-xs text-ink shadow-md">
            ¡Enlace copiado!
          </div>
        )}
      </div>
    </Modal>
  );
}
