/**
 * Server-only Gemini helper. Uses REST API so no SDK required.
 * Set GEMINI_API_KEY in env (or OPENAI_API_KEY as fallback).
 * Model can be passed per request or set via GEMINI_MODEL env.
 */
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_MODEL_IDS = [
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
  "gemini-1.0-pro-latest",
] as const;

export type GeminiModelId = (typeof GEMINI_MODEL_IDS)[number];

const DEFAULT_MODEL: GeminiModelId = "gemini-2.5-flash";

export async function generateText(
  prompt: string,
  model?: string | null
): Promise<string> {
  const key = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set (or set OPENAI_API_KEY as fallback)");
  }
  const modelId =
    model && GEMINI_MODEL_IDS.includes(model as GeminiModelId)
      ? model
      : (process.env.GEMINI_MODEL as GeminiModelId) || DEFAULT_MODEL;
  const url = `${GEMINI_BASE}/${modelId}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text.trim();
}

/** Parse JSON from AI response, best-effort */
export function parseJsonFromText<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
