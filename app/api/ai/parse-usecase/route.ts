import { NextResponse } from "next/server";
import { generateText, parseJsonFromText } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { description, systemNames } = (await req.json()) as {
      description: string;
      systemNames?: string[];
    };
    if (!description?.trim()) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }
    const systemsHint =
      Array.isArray(systemNames) && systemNames.length > 0
        ? `Known systems: ${systemNames.join(", ")}. `
        : "";

    const prompt = `You are an integration analyst. Given a short description of an integration use case, extract structured data.

${systemsHint}User description: "${description.trim()}"

Respond with ONLY a single JSON object (no markdown, no explanation) with these keys:
- suggestedName: string (short scenario name, e.g. "WO created in CorrigoPro → Create in Salesforce")
- ctaSystemName: string or null (name of source system where the trigger happens)
- ctsSystemName: string or null (name of target system where the action happens)
- keyEntities: string[] (e.g. ["Work Order", "Site", "Contact"])
- oneLiner: string (one sentence summary of the use case)`;

    const text = await generateText(prompt);
    const parsed = parseJsonFromText<{
      suggestedName?: string;
      ctaSystemName?: string | null;
      ctsSystemName?: string | null;
      keyEntities?: string[];
      oneLiner?: string;
    }>(text);

    if (!parsed) {
      return NextResponse.json({
        suggestedName: "",
        ctaSystemName: null,
        ctsSystemName: null,
        keyEntities: [],
        oneLiner: text.slice(0, 200),
      });
    }
    return NextResponse.json({
      suggestedName: parsed.suggestedName ?? "",
      ctaSystemName: parsed.ctaSystemName ?? null,
      ctsSystemName: parsed.ctsSystemName ?? null,
      keyEntities: Array.isArray(parsed.keyEntities) ? parsed.keyEntities : [],
      oneLiner: parsed.oneLiner ?? "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
