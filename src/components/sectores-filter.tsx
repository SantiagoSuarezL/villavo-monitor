'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { useNavPending } from '@/components/nav-pending';

interface Sector {
  id: number;
  nombre_sector: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SectoresFilter({ currentSectorId }: { currentSectorId: string | null }) {
  const { data: sectores } = useSWR<Sector[]>('/api/sectores', fetcher, {
    revalidateOnFocus: false,
  });
  const { navigate } = useNavPending();

  const [selected, setSelected] = useState(currentSectorId ?? '');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelected(value);
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set('sector_id', value);
    } else {
      url.searchParams.delete('sector_id');
    }
    navigate(url.toString());
  };

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="block w-full sm:w-52 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
    >
      <option value="">Todos los sectores</option>
      {(sectores ?? []).map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre_sector}
        </option>
      ))}
    </select>
  );
}
