"use client";

import { useCallback, useEffect, useState } from "react";

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

export function useBillingAccess(): BillingState {
  const [access, setAccess] = useState<BillingAccessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void refresh();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
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
