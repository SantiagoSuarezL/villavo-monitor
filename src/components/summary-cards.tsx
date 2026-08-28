'use client';

import React from 'react';
import useSWR from 'swr';
import { Reveal } from '@/components/reveal';

interface Summary {
  fecha: string;
  total_sectores: number;
  con_servicio: number;
  sin_servicio: number;
  baja_presion: number;
  ultima_actualizacion: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const cards = [
  {
    marker: '01',
    key: 'con_servicio' as const,
    label: 'Sectores con agua hoy',
    dot: 'bg-green-600',
    tone: 'text-green-700',
  },
  {
    marker: '02',
    key: 'sin_servicio' as const,
    label: 'Sectores sin agua hoy',
    dot: 'bg-red-600',
    tone: 'text-red-700',
  },
  {
    marker: '03',
    key: 'baja_presion' as const,
    label: 'Con baja presión',
    dot: 'bg-yellow-600',
    tone: 'text-yellow-700',
  },
  {
    marker: '04',
    key: 'total_sectores' as const,
    label: 'Sectores monitoreados',
    dot: 'bg-accent',
    tone: 'text-ink',
  },
];

export function SummaryCards() {
  const { data } = useSWR<Summary>('/api/summary', fetcher, {
    revalidateOnFocus: false,
  });

  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card) => (
          <div key={card.key} className="border border-line bg-paper rounded-lg p-4 animate-pulse">
            <div className="h-3 w-8 bg-paper-deep rounded mb-3" />
            <div className="h-8 bg-paper-deep rounded w-14 mb-1.5" />
            <div className="h-3 bg-paper-deep rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <Reveal key={card.key} delay={i * 70}>
          <div className="frame-brackets h-full rounded-lg border border-line bg-paper px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className={`size-1.5 rounded-full ${card.dot}`} />
              <span className="font-mono text-[10px] tracking-widest text-mute">
                {card.marker}
              </span>
            </div>
            <div className={`mt-3 text-3xl font-semibold tabular-nums tracking-tight ${card.tone}`}>
              {data[card.key]}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase leading-snug tracking-wider text-mute">
              {card.label}
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
