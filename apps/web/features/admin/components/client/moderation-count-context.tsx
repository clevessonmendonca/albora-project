"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ModerationCountContextValue = {
  count: number;
  setCount: (n: number) => void;
};

const ModerationCountContext = createContext<ModerationCountContextValue>({
  count: 0,
  setCount: () => undefined,
});

export function ModerationCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  return (
    <ModerationCountContext.Provider value={{ count, setCount }}>
      {children}
    </ModerationCountContext.Provider>
  );
}

export function useModerationCount(): ModerationCountContextValue {
  return useContext(ModerationCountContext);
}
