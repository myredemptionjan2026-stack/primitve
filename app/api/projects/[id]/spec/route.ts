import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: scenarios, error: scenErr } = await supabase
    .from("scenarios")
    .select("*, field_mappings(*)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (scenErr) {
    return NextResponse.json({ error: scenErr.message }, { status: 500 });
  }

  const systemIds = new Set<string>();
  for (const s of scenarios ?? []) {
    if (s.cta_system_id) systemIds.add(s.cta_system_id);
    if (s.cts_system_id) systemIds.add(s.cts_system_id);
  }

  let systems: { id: string; name: string; base_url: string; auth_type: string; docs_url: string | null }[] = [];
  if (systemIds.size > 0) {
    const { data: sysData } = await supabase
      .from("systems")
      .select("id, name, base_url, auth_type, docs_url")
      .in("id", Array.from(systemIds));
    systems = sysData ?? [];
  }

  const sysMap = new Map(systems.map((s) => [s.id, s]));

  const lines: string[] = [];
  lines.push(`# Integration Spec: ${project.name}`);
  lines.push("");
  if (project.description) {
    lines.push(project.description);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("## Systems");
  lines.push("");
  for (const s of systems) {
    lines.push(`- **${s.name}**`);
    lines.push("  - Base URL: `" + s.base_url + "`");
    lines.push(`  - Auth: ${s.auth_type}`);
    if (s.docs_url) lines.push(`  - Docs: ${s.docs_url}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("## Use cases (CTA / CTS)");
  lines.push("");

  for (const sc of scenarios ?? []) {
    const ctaSys = sc.cta_system_id ? sysMap.get(sc.cta_system_id) : null;
    const ctsSys = sc.cts_system_id ? sysMap.get(sc.cts_system_id) : null;
    lines.push(`### ${sc.name}`);
    if (sc.description) {
      lines.push("");
      lines.push(sc.description);
      lines.push("");
    }
    lines.push(`- **CTA (source):** ${ctaSys?.name ?? "(not set)"}`);
    lines.push(`- **CTS (target):** ${ctsSys?.name ?? "(not set)"}`);
    lines.push("");
    const mappings = (sc.field_mappings ?? []) as { source_path: string; target_path: string }[];
    if (mappings.length > 0) {
      lines.push("| Source (CTA) | Target (CTS) |");
      lines.push("|--------------|--------------|");
      for (const m of mappings) {
        lines.push("| `" + m.source_path + "` | `" + m.target_path + "` |");
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("## Out of scope");
  lines.push("");
  lines.push("(To be filled.)");
  lines.push("");
  lines.push("## Open questions");
  lines.push("");
  lines.push("(To be filled.)");
  lines.push("");

  const markdown = lines.join("\n");
  return NextResponse.json({ markdown });
}
