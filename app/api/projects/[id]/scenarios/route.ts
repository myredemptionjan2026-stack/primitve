import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("scenarios")
    .select("*, field_mappings(*)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { project_id, name, description, cta_system_id, cts_system_id } = body as {
    project_id: string;
    name: string;
    description?: string;
    cta_system_id?: string | null;
    cts_system_id?: string | null;
  };

  if (!project_id || !name?.trim()) {
    return NextResponse.json(
      { error: "project_id and name are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("scenarios")
    .insert({
      project_id,
      name: name.trim(),
      description: description?.trim() || null,
      cta_system_id: cta_system_id || null,
      cts_system_id: cts_system_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
