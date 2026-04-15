"use client";

import { createContext, useContext, useState } from "react";

type BrandMenuContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const BrandMenuContext = createContext<BrandMenuContextValue | null>(null);

export function BrandMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value: BrandMenuContextValue = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
  };

  return <BrandMenuContext.Provider value={value}>{children}</BrandMenuContext.Provider>;
}

export function useBrandMenu() {
  const ctx = useContext(BrandMenuContext);
  if (!ctx) {
    throw new Error("useBrandMenu must be used within BrandMenuProvider");
  }
  return ctx;
}
