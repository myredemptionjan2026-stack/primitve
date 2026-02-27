"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { System } from "@/lib/types";

type Step = 1 | 2 | 3;

interface ParsedUseCase {
  suggestedName: string;
  ctaSystemName: string | null;
  ctsSystemName: string | null;
  oneLiner: string;
}

export default function ExploreNewPage() {
  const [step, setStep] = useState<Step>(1);
  const [useCaseText, setUseCaseText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedUseCase | null>(null);
  const [projectName, setProjectName] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDesc, setScenarioDesc] = useState("");
  const [systems, setSystems] = useState<System[]>([]);
  const [ctaSystemId, setCtaSystemId] = useState("");
  const [ctsSystemId, setCtsSystemId] = useState("");
  const [newSysName, setNewSysName] = useState("");
  const [newSysBaseUrl, setNewSysBaseUrl] = useState("");
  const [addingSystem, setAddingSystem] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ projectId: string; scenarioId: string; ctaId: string; ctsId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/systems")
      .then((r) => r.json())
      .then((data) => setSystems(Array.isArray(data) ? data : []))
      .catch(() => setSystems([]));
  }, []);

  async function parseUseCase() {
    if (!useCaseText.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/parse-usecase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: useCaseText.trim(),
          systemNames: systems.map((s) => s.name),
        }),
      });
      const data = await res.json();
      if (res.ok && data) {
        setParsed({
          suggestedName: data.suggestedName ?? "",
          ctaSystemName: data.ctaSystemName ?? null,
          ctsSystemName: data.ctsSystemName ?? null,
          oneLiner: data.oneLiner ?? "",
        });
        setScenarioName(data.suggestedName ?? "");
        setScenarioDesc(data.oneLiner ?? "");
        const cta = systems.find((s) =>
          (data.ctaSystemName ?? "").toLowerCase().split(/\s+/).some((w: string) => s.name.toLowerCase().includes(w))
        );
        const cts = systems.find((s) =>
          (data.ctsSystemName ?? "").toLowerCase().split(/\s+/).some((w: string) => s.name.toLowerCase().includes(w))
        );
        if (cta) setCtaSystemId(cta.id);
        if (cts) setCtsSystemId(cts.id);
      } else {
        setError(data?.error ?? "Parse failed");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function addSystem(e: React.FormEvent) {
    e.preventDefault();
    if (!newSysName.trim() || !newSysBaseUrl.trim()) return;
    setAddingSystem(true);
    setError(null);
    try {
      const res = await fetch("/api/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSysName.trim(),
          base_url: newSysBaseUrl.trim(),
          auth_type: "apiKey",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSystems((prev) => [data, ...prev]);
        if (!ctaSystemId) setCtaSystemId(data.id);
        else if (!ctsSystemId) setCtsSystemId(data.id);
        setNewSysName("");
        setNewSysBaseUrl("");
      } else {
        setError(data?.error ?? "Failed to add system");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAddingSystem(false);
    }
  }

  async function createProjectAndScenario(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim() || !scenarioName.trim()) return;
    if (!ctaSystemId || !ctsSystemId) {
      setError("Select both CTA and CTS systems (or add new ones above).");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const projRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim(), description: scenarioDesc.trim() || undefined }),
      });
      if (!projRes.ok) {
        const d = await projRes.json();
        setError(d?.error ?? "Failed to create project");
        return;
      }
      const project = await projRes.json();
      const scenRes = await fetch("/api/projects/" + project.id + "/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          name: scenarioName.trim(),
          description: scenarioDesc.trim() || undefined,
          cta_system_id: ctaSystemId,
          cts_system_id: ctsSystemId,
        }),
      });
      if (!scenRes.ok) {
        const d = await scenRes.json();
        setError(d?.error ?? "Failed to create scenario");
        return;
      }
      const scenario = await scenRes.json();
      setCreated({
        projectId: project.id,
        scenarioId: scenario.id,
        ctaId: ctaSystemId,
        ctsId: ctsSystemId,
      });
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-primitive-bg text-slate-100">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/" className="text-sm text-primitive-accent hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">
          New Integration Exploration
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Step {step} of 3
        </p>

        {step === 1 && (
          <section className="mt-8 space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-base font-medium text-slate-200">Describe your integration</h2>
            <p className="text-xs text-slate-500">
              Describe the use case in a sentence. Gemini will suggest a scenario name and source/target systems.
            </p>
            <textarea
              value={useCaseText}
              onChange={(e) => setUseCaseText(e.target.value)}
              placeholder="e.g. When a work order is created in CorrigoPro, create a matching record in Salesforce."
              rows={3}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={parseUseCase}
              disabled={parsing || !useCaseText.trim()}
              className="rounded-lg bg-primitive-accent px-4 py-2 text-sm font-medium text-white hover:bg-primitive-accentHover disabled:opacity-50"
            >
              {parsing ? "Parsing…" : "Parse with Gemini"}
            </button>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            {parsed && (
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm">
                <p className="font-medium text-slate-200">Suggested scenario:</p>
                <p className="mt-1 text-white">{parsed.suggestedName}</p>
                <p className="mt-2 text-slate-400">{parsed.oneLiner}</p>
                <p className="mt-2 text-slate-500 text-xs">
                  CTA: {parsed.ctaSystemName ?? "—"} → CTS: {parsed.ctsSystemName ?? "—"}
                </p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mt-4 rounded-lg border border-primitive-accent px-4 py-2 text-sm text-primitive-accent hover:bg-slate-800"
                >
                  Next: Configure project & systems
                </button>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <form onSubmit={createProjectAndScenario} className="mt-8 space-y-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-base font-medium text-slate-200">Project & scenario</h2>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Project name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. CorrigoPro ↔ Salesforce"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Scenario name</label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g. WO created → Create in Salesforce"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Scenario description (optional)</label>
              <textarea
                value={scenarioDesc}
                onChange={(e) => setScenarioDesc(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
              />
            </div>

            <h3 className="text-sm font-medium text-slate-300">Systems (CTA = source, CTS = target)</h3>
            {systems.length === 0 && (
              <p className="text-xs text-slate-500">Add at least two systems below, then select CTA and CTS.</p>
            )}
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 space-y-3">
              <p className="text-xs font-medium text-slate-400">Quick-add system</p>
              <form onSubmit={addSystem} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newSysName}
                  onChange={(e) => setNewSysName(e.target.value)}
                  placeholder="System name"
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
                />
                <input
                  type="url"
                  value={newSysBaseUrl}
                  onChange={(e) => setNewSysBaseUrl(e.target.value)}
                  placeholder="Base URL"
                  className="min-w-[200px] rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={addingSystem || !newSysName.trim() || !newSysBaseUrl.trim()}
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  {addingSystem ? "Adding…" : "Add system"}
                </button>
              </form>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-400">CTA system (source)</label>
                <select
                  value={ctaSystemId}
                  onChange={(e) => setCtaSystemId(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-primitive-accent focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">CTS system (target)</label>
                <select
                  value={ctsSystemId}
                  onChange={(e) => setCtsSystemId(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-primitive-accent focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={creating || !projectName.trim() || !scenarioName.trim() || !ctaSystemId || !ctsSystemId}
                className="rounded-lg bg-primitive-accent px-4 py-2 text-sm font-medium text-white hover:bg-primitive-accentHover disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create project & scenario"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && created && (
          <section className="mt-8 space-y-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-base font-medium text-slate-200">You’re all set</h2>
            <p className="text-sm text-slate-400">
              Next: discover fields for each system, then map them in the scenario and generate the spec.
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href={`/systems/${created.ctaId}`}
                  className="text-primitive-accent hover:underline"
                >
                  Discover CTA (source) fields →
                </Link>
              </li>
              <li>
                <Link
                  href={`/systems/${created.ctsId}`}
                  className="text-primitive-accent hover:underline"
                >
                  Discover CTS (target) fields →
                </Link>
              </li>
              <li>
                <Link
                  href={`/scenarios/${created.scenarioId}`}
                  className="text-primitive-accent hover:underline"
                >
                  Map fields & set verdict →
                </Link>
              </li>
              <li>
                <Link
                  href={`/projects/${created.projectId}`}
                  className="text-primitive-accent hover:underline"
                >
                  View project & generate spec →
                </Link>
              </li>
            </ul>
            <div className="pt-4">
              <Link
                href={`/projects/${created.projectId}`}
                className="rounded-lg bg-primitive-accent px-4 py-2 text-sm font-medium text-white hover:bg-primitive-accentHover"
              >
                Open project
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
