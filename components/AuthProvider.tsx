"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseReady } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { fetchProfileByUserId, type UserProfile } from "@/lib/auth/profile";
import { adoptGuestLessonTray } from "@/lib/lessons/tray";

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncProfile = async (nextUser: User | null) => {
      if (nextUser) adoptGuestLessonTray();
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const nextProfile = await fetchProfileByUserId(nextUser.id);
        if (!mounted) return;
        setProfile(nextProfile);
      } catch (error) {
        console.warn("AuthProvider: failed to load profile:", error);
        if (!mounted) return;
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const loadInitialSession = async () => {
      try {
        await supabaseReady;
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        await syncProfile(data.session?.user ?? null);
      } catch (error) {
        // A paused or temporarily unreachable Supabase project must not leave
        // the entire application stuck on its authentication loading state.
        console.warn("AuthProvider: authentication is unavailable:", error);
        if (!mounted) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    void loadInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncProfile(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
