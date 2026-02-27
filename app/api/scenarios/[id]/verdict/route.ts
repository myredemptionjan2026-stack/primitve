import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: constraints, error: cErr } = await supabase
    .from("constraints")
    .select("*")
    .eq("scenario_id", id);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  const list = constraints ?? [];
  const fromLive = list.filter((c) => c.source === "live");
  const fromDocs = list.filter((c) => c.source === "docs");
  const fromInference = list.filter((c) => c.source === "inference");
  let verdict: "Feasible" | "Partially Feasible" | "Not Feasible" = "Feasible";
  let confidence: "High" | "Medium" | "Low" = "Medium";
  if (fromLive.some((c) => (c.description ?? "").toLowerCase().includes("fail") || (c.description ?? "").toLowerCase().includes("error"))) {
    verdict = "Not Feasible";
    confidence = "High";
  } else if (fromInference.length > 0 && fromLive.length === 0) {
    verdict = "Partially Feasible";
    confidence = "Low";
  } else if (fromLive.length > 0) {
    confidence = "High";
  }
  return NextResponse.json({
    verdict,
    confidence,
    evidence: {
      fromDocs: fromDocs.length,
      fromLive: fromLive.length,
      fromInference: fromInference.length,
    },
    constraints: list,
  });
}
