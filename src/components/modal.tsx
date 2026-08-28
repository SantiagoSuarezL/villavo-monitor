'use client';

import React, { useEffect, useRef } from 'react';

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = 'modal-title';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-field/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="modal-panel frame-brackets relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-paper p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] outline-none sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            {subtitle && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
                {subtitle}
              </p>
            )}
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md border border-line bg-paper px-2.5 py-1.5 font-mono text-xs text-mute transition-colors hover:border-accent hover:text-accent"
          >
            ESC
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
