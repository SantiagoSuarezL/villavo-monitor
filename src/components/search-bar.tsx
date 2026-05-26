'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar({ currentQ }: { currentQ: string | null }) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(currentQ ?? '');
  const [query, setQuery] = useState(currentQ ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setQuery(value);
    }, 300);
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    router.replace(url.toString());
  }, [query, router]);

  return (
    <div className="relative flex-1">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Buscar barrio o sector..."
        className="w-full pl-10 pr-3 py-2 rounded-md border border-[#e5e7eb] bg-white text-sm text-[#111827] shadow-sm placeholder:text-[#6b7280] focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
      />
    </div>
  );
}
