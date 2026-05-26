'use client';

import React from 'react';
import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        refreshInterval: 300_000, // 5 min
        revalidateOnFocus: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
