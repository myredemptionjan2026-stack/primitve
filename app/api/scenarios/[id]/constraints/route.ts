import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("constraints")
    .select("*")
    .eq("scenario_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    description: string;
    category?: string;
    source: "docs" | "live" | "inference";
  };
  if (!body.description?.trim() || !body.source) {
    return NextResponse.json(
      { error: "description and source required" },
      { status: 400 }
    );
  }
  const { data, error } = await supabase
    .from("constraints")
    .insert({
      scenario_id: id,
      description: body.description.trim(),
      category: body.category?.trim() || null,
      source: body.source,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
