import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("systems")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, base_url, auth_type, docs_url } = body as {
    name: string;
    base_url: string;
    auth_type: "apiKey" | "bearer";
    docs_url?: string;
  };

  if (!name?.trim() || !base_url?.trim()) {
    return NextResponse.json(
      { error: "name and base_url are required" },
      { status: 400 }
    );
  }

  const auth = auth_type === "bearer" ? "bearer" : "apiKey";

  const { data, error } = await supabase
    .from("systems")
    .insert({
      name: name.trim(),
      base_url: base_url.trim(),
      auth_type: auth,
      docs_url: docs_url?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
