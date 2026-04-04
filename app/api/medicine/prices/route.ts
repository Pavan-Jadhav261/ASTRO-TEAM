import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key missing." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const medicine = String(body.medicine || "").trim();
  if (!medicine) {
    return NextResponse.json({ error: "Medicine name required." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: `Find online prices in INR for ${medicine}. Return JSON array with fields: title, price_inr, url, source.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "";
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  return NextResponse.json({ text, data: parsed });
}
