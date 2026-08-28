'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useNavPending } from '@/components/nav-pending';

export function SearchBar({ currentQ }: { currentQ: string | null }) {
  const { isPending, navigate } = useNavPending();
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
    navigate(url.toString());
  }, [query, navigate]);

  return (
    <div className="relative flex-1">
      {isPending ? (
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      )}
      <input
        type="text"
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Buscar barrio o sector..."
        className="w-full rounded-md border border-line bg-paper py-2 pl-10 pr-9 text-sm text-ink placeholder:text-mute focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
      />
      {searchInput && (
        <button
          type="button"
          onClick={() => handleSearchChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-mute transition-colors hover:bg-paper-soft hover:text-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
        >
          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
