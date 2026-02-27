"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/types";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
    });
    if (res.ok) {
      const created = await res.json();
      setProjects((prev) => [created, ...prev]);
      setNewName("");
      setNewDesc("");
      setShowNewProject(false);
    }
  }

  async function resetAllData() {
    const ok = window.confirm(
      "This will delete ALL projects, systems, scenarios, mappings, constraints, field flags, and discovery data. This cannot be undone. Continue?"
    );
    if (!ok) return;
    setResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResetMessage(data?.error ?? "Reset failed");
      } else {
        setProjects([]);
        setResetMessage("All Primitive data deleted.");
      }
    } catch (e) {
      setResetMessage((e as Error).message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="min-h-screen bg-primitive-bg text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Primitive
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Discover. Test. Document. One integration workspace.
          </p>
        </header>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-200">Projects</h2>
            <div className="flex gap-2">
              <Link
                href="/explore/new"
                className="rounded-lg bg-primitive-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-primitive-accentHover"
              >
                New Integration Exploration
              </Link>
              <button
                type="button"
                onClick={() => setShowNewProject(true)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Quick create project
              </button>
            </div>
          </div>

          {showNewProject && (
            <form
              onSubmit={createProject}
              className="mb-6 rounded-xl border border-slate-700 bg-slate-800/60 p-6"
            >
              <h3 className="mb-4 text-base font-medium">Create project</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. CorrigoPro ↔ Salesforce"
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">
                    Description (optional)
                  </label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Brief description of this integration"
                    rows={2}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-primitive-accent px-4 py-2 text-sm font-medium text-white hover:bg-primitive-accentHover"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewProject(false);
                      setNewName("");
                      setNewDesc("");
                    }}
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-slate-500">Loading projects…</p>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/30 p-12 text-center text-slate-500">
              No projects yet. Click &quot;New Integration Exploration&quot; to
              start.
            </div>
          ) : (
            <ul className="space-y-3">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="block rounded-xl border border-slate-700 bg-slate-800/60 p-5 transition hover:border-slate-600 hover:bg-slate-800"
                  >
                    <span className="font-medium text-white">{p.name}</span>
                    {p.description && (
                      <p className="mt-1 text-sm text-slate-400">
                        {p.description}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10 rounded-xl border border-rose-900 bg-rose-950/40 p-5">
          <h2 className="text-sm font-semibold text-rose-300">Danger zone</h2>
          <p className="mt-1 text-xs text-rose-200/80">
            Delete all Primitive data from this Supabase project. Intended for local/dev or when you want a clean slate.
          </p>
          <button
            type="button"
            onClick={resetAllData}
            disabled={resetting}
            className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
          >
            {resetting ? "Deleting everything…" : "Delete ALL projects, systems, and scenarios"}
          </button>
          {resetMessage && (
            <p className="mt-2 text-xs text-rose-200">{resetMessage}</p>
          )}
        </section>
      </div>
    </main>
  );
}
