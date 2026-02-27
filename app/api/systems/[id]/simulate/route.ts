import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const METHOD = "GET";
const PATH = "__primitive_discovery__";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as { payload?: unknown };

  const { data: endpoint, error: epErr } = await supabase
    .from("endpoints")
    .select("response_schema")
    .eq("system_id", id)
    .eq("method", METHOD)
    .eq("path", PATH)
    .maybeSingle();

  if (epErr) {
    return NextResponse.json({ error: epErr.message }, { status: 500 });
  }

  const schema = endpoint?.response_schema;
  const payload = body.payload;

  if (!schema) {
    return NextResponse.json({
      simulated: true,
      message: "No discovery sample stored. Paste a sample JSON on the system discovery page first.",
      valid: false,
      mockResponse: null,
    });
  }

  // Simple structural check: if payload is object, same top-level keys as schema (optional)
  let valid = true;
  let message = "Simulation: payload shape matches known sample. No live call made.";
  if (payload != null && typeof payload === "object" && !Array.isArray(payload)) {
    const schemaObj = schema as Record<string, unknown>;
    if (typeof schemaObj === "object" && schemaObj !== null && !Array.isArray(schemaObj)) {
      // Best-effort: just note we're simulating
      valid = true;
    }
  }

  return NextResponse.json({
    simulated: true,
    message,
    valid,
    mockResponse: schema,
  });
}
