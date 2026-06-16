"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { fetchProfileByUserId, type UserProfile } from "@/lib/auth/profile";

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
    console.log(
      "AuthProvider: window.__SUPABASE_CLIENT_ID__",
      (window as any).__SUPABASE_CLIENT_ID__
    );
    console.log(
      "AuthProvider: supabase === window.__SUPABASE_CLIENT__?",
      supabase === (window as any).__SUPABASE_CLIENT__
    );

    let mounted = true;

    const syncProfile = async (nextUser: User | null) => {
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

    supabase.auth.getSession().then(({ data }) => {
      console.log("AuthProvider: initial session", data.session);
      void syncProfile(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("AuthProvider: auth state change", session);
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
