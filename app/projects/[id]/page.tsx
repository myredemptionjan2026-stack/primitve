"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Project, System, Scenario } from "@/lib/types";

interface ScenarioWithMappings extends Scenario {
  field_mappings?: { id: string; source_path: string; target_path: string }[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [systems, setSystems] = useState<System[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioWithMappings[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [sysName, setSysName] = useState("");
  const [sysBaseUrl, setSysBaseUrl] = useState("");
  const [sysAuthType, setSysAuthType] = useState<"apiKey" | "bearer">("apiKey");
  const [sysDocsUrl, setSysDocsUrl] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDesc, setScenarioDesc] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then((r) => r.json()),
      fetch("/api/systems").then((r) => r.json()),
      fetch(`/api/projects/${id}/scenarios`).then((r) => r.json()),
    ]).then(([proj, sysList, scenList]) => {
      setProject(proj);
      setSystems(Array.isArray(sysList) ? sysList : []);
      setScenarios(Array.isArray(scenList) ? scenList : []);
    }).catch(() => {
      setProject(null);
      setSystems([]);
      setScenarios([]);
    }).finally(() => setLoading(false));
  }, [id]);

  async function addSystem(e: React.FormEvent) {
    e.preventDefault();
    if (!sysName.trim() || !sysBaseUrl.trim()) return;
    const res = await fetch("/api/systems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sysName.trim(),
        base_url: sysBaseUrl.trim(),
        auth_type: sysAuthType,
        docs_url: sysDocsUrl.trim() || undefined,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setSystems((prev) => [created, ...prev]);
      setSysName("");
      setSysBaseUrl("");
      setSysDocsUrl("");
      setShowAddSystem(false);
    }
  }

  async function addScenario(e: React.FormEvent) {
    e.preventDefault();
    if (!scenarioName.trim()) return;
    const res = await fetch(`/api/projects/${id}/scenarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: id,
        name: scenarioName.trim(),
        description: scenarioDesc.trim() || undefined,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setScenarios((prev) => [created, ...prev]);
      setScenarioName("");
      setScenarioDesc("");
      setShowNewScenario(false);
    }
  }

  if (loading || !project) {
    return (
      <main className="min-h-screen bg-primitive-bg p-6">
        <p className="text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-primitive-bg text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <Link
            href="/"
            className="text-sm text-primitive-accent hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {project.name}
          </h1>
          {project.description && (
            <p className="mt-1 text-slate-400">{project.description}</p>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-200">Systems</h2>
              <button
                type="button"
                onClick={() => setShowAddSystem(true)}
                className="text-sm text-primitive-accent hover:underline"
              >
                + Add system
              </button>
            </div>

            {showAddSystem && (
              <form
                onSubmit={addSystem}
                className="mb-6 rounded-xl border border-slate-700 bg-slate-800/60 p-5"
              >
                <div className="space-y-3">
                  <input
                    type="text"
                    value={sysName}
                    onChange={(e) => setSysName(e.target.value)}
                    placeholder="System name (e.g. CorrigoPro)"
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
                  />
                  <input
                    type="url"
                    value={sysBaseUrl}
                    onChange={(e) => setSysBaseUrl(e.target.value)}
                    placeholder="Base URL (e.g. https://api.example.com)"
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
                  />
                  <select
                    value={sysAuthType}
                    onChange={(e) =>
                      setSysAuthType(e.target.value as "apiKey" | "bearer")
                    }
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-primitive-accent focus:outline-none"
                  >
                    <option value="apiKey">API Key</option>
                    <option value="bearer">Bearer token</option>
                  </select>
                  <input
                    type="url"
                    value={sysDocsUrl}
                    onChange={(e) => setSysDocsUrl(e.target.value)}
                    placeholder="Docs URL (optional)"
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-primitive-accent px-3 py-1.5 text-sm text-white hover:bg-primitive-accentHover"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSystem(false)}
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {systems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-600 p-6 text-center text-slate-500">
                No systems yet. Add systems to use in CTA/CTS scenarios.
              </p>
            ) : (
              <ul className="space-y-2">
                {systems.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3"
                  >
                    <span className="font-medium text-white">{s.name}</span>
                    <p className="text-xs text-slate-500">{s.base_url}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-200">Scenarios</h2>
              <button
                type="button"
                onClick={() => setShowNewScenario(true)}
                className="text-sm text-primitive-accent hover:underline"
              >
                + New scenario
              </button>
            </div>

            {showNewScenario && (
              <form
                onSubmit={addScenario}
                className="mb-6 rounded-xl border border-slate-700 bg-slate-800/60 p-5"
              >
                <div className="space-y-3">
                  <input
                    type="text"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="Scenario name (e.g. WO created → Create in System 2)"
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
                  />
                  <textarea
                    value={scenarioDesc}
                    onChange={(e) => setScenarioDesc(e.target.value)}
                    placeholder="Describe the use case (optional)"
                    rows={2}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-primitive-accent px-3 py-1.5 text-sm text-white hover:bg-primitive-accentHover"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewScenario(false)}
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {scenarios.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-600 p-6 text-center text-slate-500">
                No scenarios yet. Add a scenario (CTA/CTS pair) for this project.
              </p>
            ) : (
              <ul className="space-y-3">
                {scenarios.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"
                  >
                    <span className="font-medium text-white">{s.name}</span>
                    {s.description && (
                      <p className="mt-1 text-sm text-slate-400">
                        {s.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      CTA/CTS — mapping UI coming next
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
