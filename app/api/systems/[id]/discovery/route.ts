import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const METHOD = "GET";
const PATH = "__primitive_discovery__";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("endpoints")
    .select("response_schema")
    .eq("system_id", id)
    .eq("method", METHOD)
    .eq("path", PATH)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sample: data?.response_schema ?? null });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as { sample: unknown };

  if (body.sample === undefined) {
    return NextResponse.json(
      { error: "sample is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("endpoints")
    .upsert(
      {
        system_id: id,
        method: METHOD,
        path: PATH,
        response_schema: body.sample,
      },
      { onConflict: "system_id,method,path" }
    )
    .select("response_schema")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sample: data.response_schema ?? null });
}

