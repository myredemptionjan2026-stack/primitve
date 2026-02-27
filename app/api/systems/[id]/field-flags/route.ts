import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: systemId } = await params;
  const { data, error } = await supabase
    .from("field_flags")
    .select("field_path, flag")
    .eq("system_id", systemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const flags: Record<string, string> = {};
  (data ?? []).forEach((row: { field_path: string; flag: string }) => {
    flags[row.field_path] = row.flag;
  });
  return NextResponse.json({ flags });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: systemId } = await params;
  const body = (await req.json()) as {
    field_path: string;
    flag: "key_id" | "business_critical" | null;
  };
  if (!body.field_path?.trim()) {
    return NextResponse.json({ error: "field_path required" }, { status: 400 });
  }
  const path = body.field_path.trim();
  if (body.flag === null || body.flag === "") {
    await supabase
      .from("field_flags")
      .delete()
      .eq("system_id", systemId)
      .eq("field_path", path);
    return NextResponse.json({ ok: true, flag: null });
  }
  if (body.flag !== "key_id" && body.flag !== "business_critical") {
    return NextResponse.json(
      { error: "flag must be key_id or business_critical" },
      { status: 400 }
    );
  }
  const { data, error } = await supabase
    .from("field_flags")
    .upsert(
      { system_id: systemId, field_path: path, flag: body.flag },
      { onConflict: "system_id,field_path" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
