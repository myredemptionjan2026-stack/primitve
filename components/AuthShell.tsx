"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const AUTH_PATHS = new Set(["/sign-in", "/sign-up"]);

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) {
          setUser(data.user ?? null);
        }
        const isAuthPage = AUTH_PATHS.has(pathname || "");
        if (!data.user && !isAuthPage) {
          router.replace("/sign-in");
        }
      } catch {
        const isAuthPage = AUTH_PATHS.has(pathname || "");
        if (!isAuthPage) {
          router.replace("/sign-in");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    router.replace("/sign-in");
  }

  const isAuthPage = AUTH_PATHS.has(pathname || "");

  return (
    <div className="min-h-screen bg-primitive-bg text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-white">
              Primitive
            </span>
            <span className="text-xs text-slate-500">
              Discover. Test. Document.
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {checking ? (
              <span className="text-slate-500">Checking session…</span>
            ) : user ? (
              <>
                <span className="max-w-[180px] truncate text-slate-300">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Sign out
                </button>
              </>
            ) : isAuthPage ? null : (
              <Link
                href="/sign-in"
                className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-49px)]">
        {checking && !isAuthPage ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500">Loading…</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

