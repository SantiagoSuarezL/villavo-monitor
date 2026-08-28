'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ESTADOS } from '@/lib/estados';
import { Modal } from '@/components/modal';

interface GlossaryContextValue {
  open: (focusKey?: string) => void;
}

const GlossaryContext = createContext<GlossaryContextValue>({ open: () => {} });

export function useEstadoGlossary() {
  return useContext(GlossaryContext);
}

export function EstadoGlossaryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ isOpen: boolean; focusKey: string | null }>({
    isOpen: false,
    focusKey: null,
  });

  const open = useCallback((focusKey?: string) => {
    setState({ isOpen: true, focusKey: focusKey ?? null });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, focusKey: null });
  }, []);

  return (
    <GlossaryContext.Provider value={{ open }}>
      {children}
      {state.isOpen && <EstadoGlossaryModal focusKey={state.focusKey} onClose={close} />}
    </GlossaryContext.Provider>
  );
}

function EstadoGlossaryModal({
  focusKey,
  onClose,
}: {
  focusKey: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!focusKey) return;
    document.getElementById(`glosario-${focusKey}`)?.scrollIntoView({ block: 'center' });
  }, [focusKey]);

  return (
    <Modal subtitle="Glosario" title="¿Qué significa cada estado?" onClose={onClose}>
      <ul className="space-y-1">
        {Object.entries(ESTADOS)
          .filter(([key]) => key !== 'suministro_normal')
          .map(([key, estado]) => (
            <li
              key={key}
              id={`glosario-${key}`}
              className={`rounded-lg border p-3 transition-colors ${
                focusKey === key
                  ? 'border-accent bg-paper-soft ring-1 ring-accent/40'
                  : 'border-line/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`size-2 shrink-0 rounded-full ${estado.dotClass}`} />
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${estado.badgeClass}`}>
                  {estado.label}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-body">{estado.description}</p>
            </li>
          ))}
      </ul>
      <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-wider text-mute">
        Reportes oficiales EAAV · Villavicencio
      </p>
    </Modal>
  );
}

export function EstadoGlossaryButton() {
  const { open } = useEstadoGlossary();

  return (
    <button
      type="button"
      onClick={() => open()}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-paper px-2.5 py-2 text-sm text-body transition-colors hover:border-accent hover:text-accent focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
    >
      <svg
        className="size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="hidden sm:inline">¿Qué significan?</span>
      <span className="sm:hidden">Estados</span>
    </button>
  );
}
