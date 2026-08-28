'use client';

import React, { createContext, useCallback, useContext, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface NavPendingContextValue {
  isPending: boolean;
  navigate: (url: string) => void;
}

const NavPendingContext = createContext<NavPendingContextValue>({
  isPending: false,
  navigate: () => {},
});

export function useNavPending() {
  return useContext(NavPendingContext);
}

export function NavPendingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (url: string) => {
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [router, startTransition]
  );

  return (
    <NavPendingContext.Provider value={{ isPending, navigate }}>
      {children}
    </NavPendingContext.Provider>
  );
}

export function PendingOverlay({ children }: { children: React.ReactNode }) {
  const { isPending } = useNavPending();

  return (
    <div
      aria-busy={isPending}
      className={`space-y-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:space-y-5 ${
        isPending ? 'select-none opacity-50 blur-[1px]' : 'opacity-100 blur-0'
      }`}
    >
      {children}
    </div>
  );
}
