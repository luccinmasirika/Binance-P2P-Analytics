"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface FiatContextValue {
  fiat: string;
  setFiat: (fiat: string) => void;
}

const FiatContext = createContext<FiatContextValue | null>(null);

export function FiatProvider({
  initialFiat,
  children,
}: {
  initialFiat: string;
  children: ReactNode;
}) {
  const [fiat, setFiatState] = useState(initialFiat);

  const value = useMemo<FiatContextValue>(
    () => ({
      fiat,
      setFiat: setFiatState,
    }),
    [fiat]
  );

  return <FiatContext.Provider value={value}>{children}</FiatContext.Provider>;
}

export function useFiat(): FiatContextValue {
  const ctx = useContext(FiatContext);
  if (!ctx) throw new Error("useFiat must be used inside <FiatProvider>");
  return ctx;
}
