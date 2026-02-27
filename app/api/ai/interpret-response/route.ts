import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { statusCode, responseBody } = (await req.json()) as {
      statusCode: number;
      responseBody: unknown;
    };

    const bodyStr =
      typeof responseBody === "string"
        ? responseBody
        : JSON.stringify(responseBody, null, 2);

    const prompt = `You are an integration analyst. Interpret this API response for a semi-technical user.

HTTP status: ${statusCode}
Response body:
${bodyStr.slice(0, 3000)}

Respond in plain language (2-4 short sentences):
1. Whether the call succeeded or failed and why.
2. Any constraints, required fields, or permission issues mentioned.
3. If it failed, what the user should do next (e.g. add a required field, check API key).`;

    const text = await generateText(prompt);
    return NextResponse.json({ summary: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
