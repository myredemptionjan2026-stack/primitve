"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { System } from "@/lib/types";
import { extractFields, type DiscoveredField } from "@/lib/fieldExtractor";

export default function SystemDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [system, setSystem] = useState<System | null>(null);
  const [loading, setLoading] = useState(true);
  const [jsonText, setJsonText] = useState("");
  const [fields, setFields] = useState<DiscoveredField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldFlags, setFieldFlags] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const [sysRes, discRes, flagsRes] = await Promise.all([
          fetch(`/api/systems/${id}`),
          fetch(`/api/systems/${id}/discovery`),
          fetch(`/api/systems/${id}/field-flags`),
        ]);
        const sysData = await sysRes.json();
        const discData = await discRes.json();
        const flagsData = await flagsRes.json();
        setSystem(sysData);
        setFieldFlags(flagsData?.flags ?? {});
        if (discData?.sample) {
          const text = JSON.stringify(discData.sample, null, 2);
          setJsonText(text);
          setFields(extractFields(discData.sample));
        }
      } catch {
        setSystem(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      setError(`Invalid JSON: ${(err as Error).message}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/systems/${id}/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save sample");
      } else {
        setFields(extractFields(data.sample));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !system) {
    return (
      <main className="min-h-screen bg-primitive-bg p-6 text-slate-100">
        <p className="text-slate-500">Loading system…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-primitive-bg text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header>
          <Link
            href="/"
            className="text-sm text-primitive-accent hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {system.name}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {system.base_url}
            {system.docs_url ? ` · Docs: ${system.docs_url}` : ""}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleSave}
            className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <h2 className="text-sm font-medium text-slate-200">
              Sample JSON payload
            </h2>
            <p className="text-xs text-slate-400">
              Paste a representative JSON response from this system (for
              example, from Postman or the API docs). Primitive will extract
              fields, types, and examples.
            </p>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={14}
              spellCheck={false}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-primitive-accent focus:outline-none"
              placeholder='e.g. { "id": "123", "status": "OPEN", "site": { "id": "S-1" } }'
            />
            {error && (
              <p className="text-xs text-rose-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primitive-accent px-4 py-2 text-xs font-medium text-white hover:bg-primitive-accentHover disabled:opacity-60"
            >
              {saving ? "Saving & extracting…" : "Save sample & extract fields"}
            </button>
          </form>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-medium text-slate-200">
              Discovered fields
            </h2>
            {fields.length === 0 ? (
              <p className="text-xs text-slate-500">
                No fields yet. Paste JSON on the left and click
                &ldquo;Save sample &amp; extract fields&rdquo;.
              </p>
            ) : (
              <div className="max-h-[440px] overflow-auto rounded-lg border border-slate-800">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Path</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Example</th>
                      <th className="px-3 py-2 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr
                        key={f.path}
                        className="border-t border-slate-800 odd:bg-slate-900/40"
                      >
                        <td className="px-3 py-1.5 font-mono text-[11px] text-slate-200">
                          {f.path}
                        </td>
                        <td className="px-3 py-1.5 text-[11px] text-slate-300">
                          {f.type}
                        </td>
                        <td className="px-3 py-1.5 text-[11px] text-slate-400">
                          {f.example ?? ""}
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            value={fieldFlags[f.path] ?? ""}
                            onChange={async (e) => {
                              const v = e.target.value as "" | "key_id" | "business_critical";
                              const flag = v === "" ? null : v;
                              const res = await fetch(`/api/systems/${id}/field-flags`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ field_path: f.path, flag }),
                              });
                              if (res.ok) {
                                setFieldFlags((prev) => {
                                  const next = { ...prev };
                                  if (flag) next[f.path] = flag;
                                  else delete next[f.path];
                                  return next;
                                });
                              }
                            }}
                            className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 focus:border-primitive-accent focus:outline-none"
                          >
                            <option value="">—</option>
                            <option value="key_id">Key ID</option>
                            <option value="business_critical">Business critical</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h2 className="text-sm font-medium text-slate-200">Test endpoint</h2>
          <p className="text-xs text-slate-400">
            Send a live request (credentials are not stored). Or simulate against the discovery sample without calling the API.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Method</label>
              <select
                id="test-method"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Path (e.g. /v1/workorders)</label>
              <input
                id="test-path"
                type="text"
                placeholder="/"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">API key (optional)</label>
              <input
                id="test-apikey"
                type="password"
                placeholder="Session only, not stored"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Bearer token (optional)</label>
              <input
                id="test-bearer"
                type="password"
                placeholder="Session only, not stored"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                const method = (document.getElementById("test-method") as HTMLSelectElement)?.value ?? "GET";
                const path = (document.getElementById("test-path") as HTMLInputElement)?.value ?? "/";
                const apiKey = (document.getElementById("test-apikey") as HTMLInputElement)?.value ?? "";
                const bearer = (document.getElementById("test-bearer") as HTMLInputElement)?.value ?? "";
                setError(null);
                try {
                  const res = await fetch(`/api/systems/${id}/test`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      method,
                      path: path || "/",
                      apiKey: apiKey || undefined,
                      bearerToken: bearer || undefined,
                    }),
                  });
                  const data = await res.json();
                  if (data.error) setError(data.error);
                  else setMessage(`Status ${data.statusCode}. ${data.summary ?? ""}`);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
              className="rounded-lg bg-primitive-accent px-4 py-2 text-xs font-medium text-white hover:bg-primitive-accentHover"
            >
              Send live request
            </button>
            <button
              type="button"
              onClick={async () => {
                setError(null);
                try {
                  const res = await fetch(`/api/systems/${id}/simulate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  setMessage(data.message ?? "Simulation complete. No live call made.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
              className="rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              Simulate (no credentials)
            </button>
          </div>
          {message && (
            <p className="text-xs text-slate-300 rounded-lg bg-slate-950 p-3">{message}</p>
          )}
        </section>
      </div>
    </main>
  );
}

