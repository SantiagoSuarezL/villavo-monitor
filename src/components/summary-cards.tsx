'use client';

import React from 'react';
import useSWR from 'swr';

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
    icon: '💧',
    key: 'con_servicio' as const,
    label: 'Sectores con agua hoy',
    color: 'text-green-600',
  },
  {
    icon: '🚫',
    key: 'sin_servicio' as const,
    label: 'Sectores sin agua hoy',
    color: 'text-red-600',
  },
  {
    icon: '⚠️',
    key: 'baja_presion' as const,
    label: 'Con baja presión',
    color: 'text-yellow-600',
  },
  {
    icon: '📊',
    key: 'total_sectores' as const,
    label: 'Sectores monitoreados',
    color: 'text-blue-600',
  },
];

export function SummaryCards() {
  const { data } = useSWR<Summary>('/api/summary', fetcher, {
    revalidateOnFocus: false,
  });

  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.key} className="bg-white rounded-lg border border-[#e5e7eb] p-4 animate-pulse">
            <div className="h-8 w-8 bg-gray-200 rounded mb-2" />
            <div className="h-7 bg-gray-200 rounded w-16 mb-1" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-white rounded-lg border border-[#e5e7eb] p-4"
        >
          <div className={`text-2xl mb-1 ${card.color}`}>{card.icon}</div>
          <div className="text-2xl font-bold text-[#111827]">
            {data[card.key]}
          </div>
          <div className="text-sm text-[#6b7280] mt-0.5">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
