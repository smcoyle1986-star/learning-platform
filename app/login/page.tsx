"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    console.log(
      "Login handler: window.__SUPABASE_CLIENT_ID__",
      (window as any).__SUPABASE_CLIENT_ID__
    );
    console.log(
      "Login handler: supabase === window.__SUPABASE_CLIENT__?",
      supabase === (window as any).__SUPABASE_CLIENT__
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("Login result:", data, error);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/");
  };

  return (
    <main className="p-10">
      <h1>Login</h1>

      <form onSubmit={handleLogin} className="flex flex-col gap-3 max-w-[300px]">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">Login</button>
      </form>

      {message && <p style={{ color: "red" }}>{message}</p>}

      <p>
        Don’t have an account?{" "}
        <Link
          href="/signup"
          className="text-[var(--color-text-main)] underline underline-offset-4"
        >
          Sign up
        </Link>
      </p>
    </main>
  );
}
