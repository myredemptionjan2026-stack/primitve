"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      setMessage(
        "If email confirmation is enabled, check your inbox. Otherwise you can sign in now."
      );
      setLoading(false);
      // Optionally navigate to sign-in
      // router.replace("/sign-in");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-49px)] items-center justify-center bg-primitive-bg px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl">
        <h1 className="mb-2 text-xl font-semibold text-white">Sign up</h1>
        <p className="mb-6 text-sm text-slate-400">
          Create an account with email and password. Configure email
          confirmation behaviour in Supabase Auth settings.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
              placeholder="At least 6 characters"
            />
          </div>
          {error && (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-emerald-400" role="status">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-primitive-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-primitive-accentHover disabled:opacity-60"
          >
            {loading ? "Signing up…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-primitive-accent hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

