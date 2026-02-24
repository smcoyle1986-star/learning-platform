// app/(auth)/signup/page.tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Signup successful! Check your email for confirmation.");
      setEmail("");
      setPassword("");
      // Redirect to landing; message could be persisted via query param or toast system
      router.replace("/?signed_up=1");
    }
  };

  return (
    <main className="p-10">
      <h1>Sign Up</h1>

      <form onSubmit={handleSignup} className="flex flex-col gap-3 max-w-[300px]">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" className="btn btn-primary">Sign Up</button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}
