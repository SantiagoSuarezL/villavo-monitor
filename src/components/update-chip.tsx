'use client';

import React from 'react';
import useSWR from 'swr';

interface Summary {
  ultima_actualizacion: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getTimeAgo(utcDateStr: string): { text: string; indicator: string; className: string } {
  const date = new Date(utcDateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return { text: 'Actualizado hace menos de 1 min', indicator: '🟢', className: 'text-green-700 bg-green-50 border-green-200' };
  if (diffMin < 60) return { text: `Actualizado hace ${diffMin} min`, indicator: '🟢', className: 'text-green-700 bg-green-50 border-green-200' };

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { text: `Actualizado hace ${diffHours} horas`, indicator: '🟡', className: 'text-yellow-700 bg-yellow-50 border-yellow-200' };

  const diffDays = Math.floor(diffHours / 24);
  return {
    text: `Sin actualizar desde ${date.toLocaleDateString('es-CO')}`,
    indicator: '🔴',
    className: 'text-red-700 bg-red-50 border-red-200',
  };
}

export function UpdateChip() {
  const { data } = useSWR<Summary>('/api/summary', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  if (!data?.ultima_actualizacion) return null;

  const { text, indicator, className } = getTimeAgo(data.ultima_actualizacion);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}
    >
      {indicator} {text}
    </span>
  );
}
