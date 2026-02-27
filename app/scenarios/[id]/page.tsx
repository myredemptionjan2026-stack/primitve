"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Scenario, System } from "@/lib/types";
import type { DiscoveredField } from "@/lib/fieldExtractor";
import { extractFields } from "@/lib/fieldExtractor";

interface FieldMappingRow {
  source_path: string;
  target_path: string;
}

export default function ScenarioDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [scenario, setScenario] = useState<Scenario & { field_mappings?: { source_path: string; target_path: string }[] } | null>(null);
  const [systems, setSystems] = useState<System[]>([]);
  const [ctaSystemId, setCtaSystemId] = useState<string>("");
  const [ctsSystemId, setCtsSystemId] = useState<string>("");
  const [ctaFields, setCtaFields] = useState<DiscoveredField[]>([]);
  const [ctsFields, setCtsFields] = useState<DiscoveredField[]>([]);
  const [mappings, setMappings] = useState<FieldMappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingScenario, setSavingScenario] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ verdict: string; confidence: string; evidence: Record<string, number> } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [constraints, setConstraints] = useState<{ id: string; description: string; source: string; category?: string | null }[]>([]);
  const [newConstraintDesc, setNewConstraintDesc] = useState("");
  const [newConstraintSource, setNewConstraintSource] = useState<"docs" | "live" | "inference">("inference");
  const [addingConstraint, setAddingConstraint] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [scenRes, sysRes] = await Promise.all([
          fetch(`/api/scenarios/${id}`),
          fetch("/api/systems"),
        ]);
        const scenData = await scenRes.json();
        const sysData = await sysRes.json();
        setScenario(scenData);
        setSystems(Array.isArray(sysData) ? sysData : []);
        setCtaSystemId(scenData?.cta_system_id ?? "");
        setCtsSystemId(scenData?.cts_system_id ?? "");
        if (Array.isArray(scenData?.field_mappings) && scenData.field_mappings.length > 0) {
          setMappings(
            scenData.field_mappings.map((m: { source_path: string; target_path: string }) => ({
              source_path: m.source_path,
              target_path: m.target_path,
            }))
          );
        }
      } catch {
        setScenario(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!ctaSystemId) {
      setCtaFields([]);
      return;
    }
    fetch(`/api/systems/${ctaSystemId}/discovery`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.sample) setCtaFields(extractFields(d.sample));
        else setCtaFields([]);
      })
      .catch(() => setCtaFields([]));
  }, [ctaSystemId]);

  useEffect(() => {
    if (!ctsSystemId) {
      setCtsFields([]);
      return;
    }
    fetch(`/api/systems/${ctsSystemId}/discovery`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.sample) setCtsFields(extractFields(d.sample));
        else setCtsFields([]);
      })
      .catch(() => setCtsFields([]));
  }, [ctsSystemId]);

  useEffect(() => {
    fetch(`/api/scenarios/${id}/verdict`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.verdict) setVerdict({ verdict: d.verdict, confidence: d.confidence ?? "", evidence: d.evidence ?? {} });
        else setVerdict(null);
      })
      .catch(() => setVerdict(null));
  }, [id]);

  useEffect(() => {
    fetch(`/api/scenarios/${id}/constraints`)
      .then((r) => r.json())
      .then((list) => setConstraints(Array.isArray(list) ? list : []))
      .catch(() => setConstraints([]));
  }, [id]);

  async function addConstraint(e: React.FormEvent) {
    e.preventDefault();
    if (!newConstraintDesc.trim()) return;
    setAddingConstraint(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/scenarios/${id}/constraints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newConstraintDesc.trim(), source: newConstraintSource }),
      });
      const data = await res.json();
      if (res.ok) {
        setConstraints((prev) => [data, ...prev]);
        setNewConstraintDesc("");
        const vRes = await fetch(`/api/scenarios/${id}/verdict`);
        const vData = await vRes.json();
        if (vData?.verdict) setVerdict({ verdict: vData.verdict, confidence: vData.confidence ?? "", evidence: vData.evidence ?? {} });
      } else setMessage(data?.error ?? "Failed to add constraint");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setAddingConstraint(false);
    }
  }

  async function suggestMappings() {
    if (ctaFields.length === 0 || ctsFields.length === 0) return;
    setSuggesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/suggest-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceFields: ctaFields.map((f) => f.path),
          targetFields: ctsFields.map((f) => f.path),
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setMappings(data.suggestions.map((s: { sourcePath: string; targetPath: string }) => ({
          source_path: s.sourcePath,
          target_path: s.targetPath,
        })));
        setMessage("AI suggestions applied. Review and save.");
      } else {
        setMessage("No suggestions returned. Add mappings manually.");
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  }

  async function saveScenario() {
    if (!scenario) return;
    setSavingScenario(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/scenarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cta_system_id: ctaSystemId || null,
          cts_system_id: ctsSystemId || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setScenario(updated);
        setMessage("Scenario saved.");
      } else {
        const err = await res.json();
        setMessage(err?.error ?? "Failed to save scenario");
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSavingScenario(false);
    }
  }

  async function saveMappings() {
    setSavingMappings(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/scenarios/${id}/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });
      if (res.ok) {
        setMessage("Mappings saved.");
      } else {
        const err = await res.json();
        setMessage(err?.error ?? "Failed to save mappings");
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSavingMappings(false);
    }
  }

  function addMapping() {
    setMappings((prev) => [...prev, { source_path: ctaFields[0]?.path ?? "", target_path: ctsFields[0]?.path ?? "" }]);
  }

  function removeMapping(index: number) {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMapping(index: number, field: "source_path" | "target_path", value: string) {
    setMappings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  if (loading || !scenario) {
    return (
      <main className="min-h-screen bg-primitive-bg p-6 text-slate-100">
        <p className="text-slate-500">Loading scenario…</p>
      </main>
    );
  }

  const projectId = scenario.project_id;

  return (
    <main className="min-h-screen bg-primitive-bg text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header>
          <Link
            href={projectId ? `/projects/${projectId}` : "/"}
            className="text-sm text-primitive-accent hover:underline"
          >
            ← Back to project
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {scenario.name}
          </h1>
          {scenario.description && (
            <p className="mt-1 text-slate-400">{scenario.description}</p>
          )}
        </header>

        {message && (
          <p className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-slate-200">
            {message}
          </p>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h2 className="text-sm font-medium text-slate-200">CTA / CTS systems</h2>
          <p className="text-xs text-slate-400">
            Choose the source system (CTA) and target system (CTS) for this scenario. Save discovery samples on each system page first so fields appear below.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">CTA (source)</label>
              <select
                value={ctaSystemId}
                onChange={(e) => setCtaSystemId(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-primitive-accent focus:outline-none"
              >
                <option value="">— Select system —</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">CTS (target)</label>
              <select
                value={ctsSystemId}
                onChange={(e) => setCtsSystemId(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-primitive-accent focus:outline-none"
              >
                <option value="">— Select system —</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={saveScenario}
            disabled={savingScenario}
            className="rounded-lg bg-primitive-accent px-4 py-2 text-sm font-medium text-white hover:bg-primitive-accentHover disabled:opacity-60"
          >
            {savingScenario ? "Saving…" : "Save scenario"}
          </button>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h2 className="text-sm font-medium text-slate-200">Field mapping</h2>
          <p className="text-xs text-slate-400">
            Map source fields (CTA) to target fields (CTS). Add a row per mapping and save.
          </p>
          {ctaFields.length === 0 || ctsFields.length === 0 ? (
            <p className="text-xs text-slate-500">
              Select CTA and CTS systems above and add discovery samples on each system page to see fields here.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Source (CTA)</th>
                      <th className="px-3 py-2 font-medium">Target (CTS)</th>
                      <th className="w-10 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((row, i) => (
                      <tr key={i} className="border-t border-slate-800 odd:bg-slate-900/40">
                        <td className="px-3 py-1.5">
                          <select
                            value={row.source_path}
                            onChange={(e) => updateMapping(i, "source_path", e.target.value)}
                            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-slate-200 focus:border-primitive-accent focus:outline-none"
                          >
                            {ctaFields.map((f) => (
                              <option key={f.path} value={f.path}>
                                {f.path}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            value={row.target_path}
                            onChange={(e) => updateMapping(i, "target_path", e.target.value)}
                            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-slate-200 focus:border-primitive-accent focus:outline-none"
                          >
                            {ctsFields.map((f) => (
                              <option key={f.path} value={f.path}>
                                {f.path}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => removeMapping(i)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addMapping}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                >
                  + Add mapping
                </button>
                <button
                  type="button"
                  onClick={suggestMappings}
                  disabled={suggesting || ctaFields.length === 0 || ctsFields.length === 0}
                  className="rounded-lg border border-primitive-accent px-3 py-1.5 text-sm text-primitive-accent hover:bg-slate-800 disabled:opacity-50"
                >
                  {suggesting ? "Suggesting…" : "Suggest mappings (AI)"}
                </button>
                <button
                  type="button"
                  onClick={saveMappings}
                  disabled={savingMappings}
                  className="rounded-lg bg-primitive-accent px-4 py-2 text-sm font-medium text-white hover:bg-primitive-accentHover disabled:opacity-60"
                >
                  {savingMappings ? "Saving…" : "Save mappings"}
                </button>
              </div>
            </>
          )}
        </section>

        {verdict && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-sm font-medium text-slate-200">Feasibility verdict</h2>
            <p className="mt-2 text-lg font-medium text-white">
              {verdict.verdict}
              <span className="ml-2 text-xs font-normal text-slate-400">
                (confidence: {verdict.confidence})
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Evidence: {verdict.evidence.fromDocs ?? 0} from docs, {verdict.evidence.fromLive ?? 0} from live test, {verdict.evidence.fromInference ?? 0} from inference.
            </p>
          </section>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-medium text-slate-200">Constraints</h2>
          <p className="mt-1 text-xs text-slate-500">Document constraints (from docs, live tests, or inference) that affect feasibility.</p>
          <form onSubmit={addConstraint} className="mt-3 flex flex-wrap items-end gap-2">
            <input
              type="text"
              value={newConstraintDesc}
              onChange={(e) => setNewConstraintDesc(e.target.value)}
              placeholder="e.g. API returns 404 when site does not exist"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primitive-accent focus:outline-none"
            />
            <select
              value={newConstraintSource}
              onChange={(e) => setNewConstraintSource(e.target.value as "docs" | "live" | "inference")}
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-primitive-accent focus:outline-none"
            >
              <option value="docs">From docs</option>
              <option value="live">From live test</option>
              <option value="inference">Inference</option>
            </select>
            <button
              type="submit"
              disabled={addingConstraint || !newConstraintDesc.trim()}
              className="rounded-lg bg-primitive-accent px-3 py-2 text-sm text-white hover:bg-primitive-accentHover disabled:opacity-60"
            >
              {addingConstraint ? "Adding…" : "Add constraint"}
            </button>
          </form>
          {constraints.length > 0 && (
            <ul className="mt-4 space-y-2">
              {constraints.map((c) => (
                <li key={c.id} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                  <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400">{c.source}</span>
                  <span className="text-slate-300">{c.description}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
