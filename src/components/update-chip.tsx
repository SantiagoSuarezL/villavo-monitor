'use client';

import React from 'react';
import useSWR from 'swr';
import { formatFechaNumerica } from '@/lib/estados';

interface Summary {
  ultima_actualizacion: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Tone = 'fresh' | 'warn' | 'stale';

function getTimeAgo(utcDateStr: string): { text: string; tone: Tone } {
  const date = new Date(utcDateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return { text: 'Actualizado hace menos de 1 min', tone: 'fresh' };
  if (diffMin < 60) return { text: `Actualizado hace ${diffMin} min`, tone: 'fresh' };

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { text: `Actualizado hace ${diffHours} horas`, tone: 'warn' };

  return {
    text: `Sin actualizar desde ${formatFechaNumerica(date)}`,
    tone: 'stale',
  };
}

const toneStyles: Record<Tone, { chip: string; dot: string; ping: boolean }> = {
  fresh: { chip: 'border-green-200 bg-green-50/80 text-green-800', dot: 'bg-green-600', ping: true },
  warn: { chip: 'border-yellow-200 bg-yellow-50/80 text-yellow-800', dot: 'bg-yellow-500', ping: false },
  stale: { chip: 'border-red-200 bg-red-50/80 text-red-800', dot: 'bg-red-600', ping: false },
};

export function UpdateChip() {
  const { data } = useSWR<Summary>('/api/summary', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  if (!data?.ultima_actualizacion) return null;

  const { text, tone } = getTimeAgo(data.ultima_actualizacion);
  const styles = toneStyles[tone];

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium ${styles.chip}`}
    >
      <span className="relative flex size-1.5">
        {styles.ping && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${styles.dot}`} />
        )}
        <span className={`relative inline-flex size-1.5 rounded-full ${styles.dot}`} />
      </span>
      <span className="font-mono tracking-tight">{text}</span>
    </span>
  );
}
