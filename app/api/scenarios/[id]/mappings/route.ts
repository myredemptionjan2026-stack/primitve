import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("field_mappings")
    .select("*")
    .eq("scenario_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { mappings } = body as {
    mappings: { source_path: string; target_path: string; transform_notes?: string }[];
  };

  if (!Array.isArray(mappings)) {
    return NextResponse.json(
      { error: "mappings must be an array" },
      { status: 400 }
    );
  }

  const { error: delError } = await supabase
    .from("field_mappings")
    .delete()
    .eq("scenario_id", id);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  if (mappings.length === 0) {
    return NextResponse.json([]);
  }

  const rows = mappings
    .filter((m) => m.source_path?.trim() && m.target_path?.trim())
    .map((m) => ({
      scenario_id: id,
      source_path: m.source_path.trim(),
      target_path: m.target_path.trim(),
      transform_notes: m.transform_notes?.trim() || null,
    }));

  const { data, error } = await supabase
    .from("field_mappings")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
