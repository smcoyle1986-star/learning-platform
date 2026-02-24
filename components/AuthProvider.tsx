"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

    supabase.auth.getSession().then(({ data }) => {
      console.log("AuthProvider: initial session", data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("AuthProvider: auth state change", event, session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
