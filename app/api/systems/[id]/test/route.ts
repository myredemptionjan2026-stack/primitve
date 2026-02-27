import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    method?: string;
    path?: string;
    apiKey?: string;
    bearerToken?: string;
    requestBody?: unknown;
  };

  const { data: system, error: sysErr } = await supabase
    .from("systems")
    .select("base_url, auth_type")
    .eq("id", id)
    .single();

  if (sysErr || !system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const method = (body.method ?? "GET").toUpperCase();
  const path = (body.path ?? "").trim() || "/";
  const url = `${system.base_url.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (body.bearerToken) {
    headers.Authorization = `Bearer ${body.bearerToken}`;
  } else if (body.apiKey) {
    headers["x-api-key"] = body.apiKey;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body:
        method !== "GET" && body.requestBody != null
          ? JSON.stringify(body.requestBody)
          : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json(
      { error: message, statusCode: 0, responseBody: null, summary: null },
      { status: 200 }
    );
  }

  let responseBody: unknown;
  const ct = res.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      responseBody = await res.json();
    } else {
      responseBody = await res.text();
    }
  } catch {
    responseBody = null;
  }

  let summary: string | null = null;
  try {
    const { generateText } = await import("@/lib/gemini");
    const bodyStr =
      typeof responseBody === "string"
        ? responseBody
        : JSON.stringify(responseBody, null, 2);
    summary = await generateText(
      `As an integration analyst, interpret this API response in 2-4 short sentences. Status: ${res.status}. Body: ${bodyStr.slice(0, 2500)}. Say if it succeeded or failed, any required fields or permission issues, and what to do next.`
    );
  } catch {
    // ignore
  }

  return NextResponse.json({
    statusCode: res.status,
    responseBody,
    summary,
  });
}
