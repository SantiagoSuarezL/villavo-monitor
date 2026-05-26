'use client';

import React, { useState } from 'react';
import useSWR from 'swr';

interface Sector {
  id: number;
  nombre_sector: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SectoresFilter({ currentSectorId }: { currentSectorId: string | null }) {
  const { data: sectores } = useSWR<Sector[]>('/api/sectores', fetcher, {
    revalidateOnFocus: false,
  });

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
    window.location.href = url.toString();
  };

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="block w-full sm:w-48 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] shadow-sm focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
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
