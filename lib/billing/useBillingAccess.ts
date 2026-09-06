"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState } from "react";

import { supabase, supabaseReady } from "@/lib/supabase/client";
import {
  canAccessGame,
  canAccessWorksheetType,
  canUsePremiumImageVariations,
  canUsePrintableOptions,
} from "@/lib/billing/access";
import type { BillingAccessSnapshot } from "@/lib/billing/types";
import type { WorksheetType } from "@/lib/worksheets/types";

type BillingState = {
  access: BillingAccessSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  canAccessGame: (gameId: string) => boolean;
  canAccessWorksheetType: (worksheetType: WorksheetType) => boolean;
  canUsePrintableOptions: boolean;
  canUsePremiumImageVariations: boolean;
};

const BillingAccessContext = createContext<BillingState | null>(null);

function useBillingAccessState(): BillingState {
  const [access, setAccess] = useState<BillingAccessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const request = (async () => {
    setLoading(true);
    setError(null);

    try {
      await supabaseReady;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch("/api/billing/access", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) {
        throw new Error(String(payload?.error ?? "Failed to load billing access."));
      }

      setAccess(payload);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load billing access.");
      setAccess(null);
    } finally {
      setLoading(false);
    }
    })();

    refreshInFlight.current = request;
    try {
      await request;
    } finally {
      refreshInFlight.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      // The explicit initial refresh above already covers this event. Ignoring
      // it avoids a second access request on every new page load.
      if (event === "INITIAL_SESSION") return;
      void refresh();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [refresh]);

  return {
    access,
    loading,
    error,
    refresh,
    canAccessGame: (gameId: string) => (access ? canAccessGame(access, gameId) : false),
    canAccessWorksheetType: (worksheetType: WorksheetType) =>
      access ? canAccessWorksheetType(access, worksheetType) : false,
    canUsePrintableOptions: access ? canUsePrintableOptions(access) : false,
    canUsePremiumImageVariations: access ? canUsePremiumImageVariations(access) : false,
  };
}

export function BillingAccessProvider({ children }: { children: React.ReactNode }) {
  const billing = useBillingAccessState();
  return createElement(BillingAccessContext.Provider, { value: billing }, children);
}

export function useBillingAccess(): BillingState {
  const shared = useContext(BillingAccessContext);
  if (!shared) {
    throw new Error("useBillingAccess must be used within BillingAccessProvider");
  }
  return shared;
}
