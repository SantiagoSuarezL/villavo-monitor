'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useNavPending } from '@/components/nav-pending';

interface EmptyStateProps {
  query?: string | null;
  onClear?: () => void;
}

export function EmptyState({ query, onClear }: EmptyStateProps) {
  const router = useRouter();
  const { navigate } = useNavPending();

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    // Prefiere navigate (transición suave dentro de NavPendingProvider), fallback a router
    try {
      navigate('/');
      return;
    } catch {
      // continue to router fallback
    }
    router.replace('/');
  };

  const hasQuery = Boolean(query && query.trim().length > 0);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {/* Ilustración 160x120 papel-técnico */}
      <div className="relative">
        <svg
          width={160}
          height={120}
          viewBox="0 0 160 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          role="img"
        >
          {/* Fondo papel */}
          <rect x="0.5" y="0.5" width={159} height={119} rx={12} fill="#faf8f3" stroke="#e5dfd0" />
          {/* Textura sutil - líneas diagonales muy bajas */}
          <g opacity={0.06}>
            <path d="M12 18 L18 12" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
            <path d="M28 18 L34 12" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
            <path d="M44 18 L50 12" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
            <path d="M12 34 L18 28" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
            <path d="M142 102 L148 96" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
            <path d="M126 102 L132 96" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
          </g>

          {/* Puntos decorativos esquinas */}
          <circle cx={14} cy={14} r={1.4} fill="#e5dfd0" />
          <circle cx={146} cy={14} r={1.4} fill="#e5dfd0" />
          <circle cx={14} cy={106} r={1.4} fill="#e5dfd0" />
          <circle cx={146} cy={106} r={1.4} fill="#e5dfd0" />
          <circle cx={80} cy={14} r={1} fill="#e5dfd0" opacity={0.8} />
          <circle cx={80} cy={106} r={1} fill="#e5dfd0" opacity={0.8} />

          {/* Gota central - estilo icon.svg */}
          <g>
            {/* Sombra / onda punteada exterior */}
            <ellipse
              cx={80}
              cy={82}
              rx={30}
              ry={9}
              fill="none"
              stroke="#b45309"
              strokeWidth={1.1}
              strokeDasharray="3 4"
              strokeLinecap="round"
              opacity={0.18}
            />
            <ellipse
              cx={80}
              cy={88}
              rx={42}
              ry={11}
              fill="none"
              stroke="#b45309"
              strokeWidth={1}
              strokeDasharray="2.5 5"
              strokeLinecap="round"
              opacity={0.11}
            />

            {/* Gota cuerpo: papel #faf8f3 sobre fondo, borde sutil */}
            <path
              d="M80 22 C80 22 56 48.5 56 67.2 A24 24 0 0 0 104 67.2 C104 48.5 80 22 80 22Z"
              fill="#f4f0e6"
              stroke="#e5dfd0"
              strokeWidth={1.2}
            />
            {/* Brillo interior gota */}
            <path
              d="M80 22 C80 22 56 48.5 56 67.2 A24 24 0 0 0 104 67.2 C104 48.5 80 22 80 22Z"
              fill="#faf8f3"
              opacity={0.95}
            />
            {/* Highlight lateral */}
            <path
              d="M72 44 C68 52 66 60 68.5 66.8"
              stroke="white"
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.7}
            />
            {/* Señal / pulso terracota punteado como en icon */}
            <path
              d="M58 71 L65 71 L70 64 L77 80 L83 66 L90 71 L102 71"
              fill="none"
              stroke="#b45309"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95}
            />
            <path
              d="M58 71 L65 71 L70 64 L77 80 L83 66 L90 71 L102 71"
              fill="none"
              stroke="white"
              strokeWidth={0.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.22}
            />
            {/* Punto de pulso */}
            <circle cx={102} cy={71} r={1.6} fill="#b45309" opacity={0.9} />
          </g>

          {/* Lupa pequeña - diagonal inferior derecha */}
          <g transform="translate(102 38)">
            <circle cx={10} cy={10} r={9.5} fill="#faf8f3" stroke="#8d8677" strokeWidth={1.2} opacity={0.95} />
            <circle cx={10} cy={10} r={6.2} fill="none" stroke="#26221c" strokeWidth={1.15} opacity={0.85} />
            <path
              d="M16.5 16.5 L21 21"
              stroke="#26221c"
              strokeWidth={1.6}
              strokeLinecap="round"
              opacity={0.9}
            />
            {/* Mango detalle */}
            <path d="M17 17 L20.2 20.2" stroke="#8d8677" strokeWidth={1} strokeLinecap="round" opacity={0.7} />
            {/* Brillo lupa */}
            <path d="M7 7.5 A6 6 0 0 1 12 7" stroke="white" strokeWidth={1} strokeLinecap="round" opacity={0.6} />
          </g>

          {/* Crosshair / mira sutil cerca lupa */}
          <g opacity={0.35}>
            <path d="M118 22 h4 M118 30 h4 M122 22 v4 M122 26 v4" stroke="#8d8677" strokeWidth={0.7} strokeLinecap="round" />
          </g>
        </svg>
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-mute">SIN RESULTADOS</p>
      <p className="mt-1.5 max-w-[28ch] text-sm leading-relaxed text-body">
        {hasQuery ? (
          <>
            No encontramos barrios que coincidan con &ldquo;<span className="font-medium text-ink">{query}</span>&rdquo;
          </>
        ) : (
          <>No hay reportes para este día.</>
        )}
      </p>

      {hasQuery && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-md border border-line bg-paper px-4 py-2 font-mono text-xs tracking-tight text-ink transition-colors hover:border-accent hover:text-accent focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
        >
          Limpiar búsqueda
        </button>
      )}
    </div>
  );
}
