import { NextResponse } from "next/server";
import { generateText, parseJsonFromText } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { sourceFields, targetFields } = (await req.json()) as {
      sourceFields: string[];
      targetFields: string[];
    };
    if (!Array.isArray(sourceFields) || !Array.isArray(targetFields)) {
      return NextResponse.json(
        { error: "sourceFields and targetFields must be arrays" },
        { status: 400 }
      );
    }

    const prompt = `You are an integration analyst. Suggest field mappings from source to target.

Source field paths (one per line):
${sourceFields.slice(0, 80).join("\n")}

Target field paths (one per line):
${targetFields.slice(0, 80).join("\n")}

Respond with ONLY a single JSON object (no markdown, no explanation):
- suggestions: array of { sourcePath: string, targetPath: string } (best-effort mappings)
- unmappedRequired: string[] (source paths that look required but have no obvious target)
- typeMismatches: array of { sourcePath: string, targetPath: string, note: string } (if any)`;

    const text = await generateText(prompt);
    const parsed = parseJsonFromText<{
      suggestions?: { sourcePath: string; targetPath: string }[];
      unmappedRequired?: string[];
      typeMismatches?: { sourcePath: string; targetPath: string; note: string }[];
    }>(text);

    if (!parsed) {
      return NextResponse.json({
        suggestions: [],
        unmappedRequired: [],
        typeMismatches: [],
      });
    }
    return NextResponse.json({
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      unmappedRequired: Array.isArray(parsed.unmappedRequired) ? parsed.unmappedRequired : [],
      typeMismatches: Array.isArray(parsed.typeMismatches) ? parsed.typeMismatches : [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
