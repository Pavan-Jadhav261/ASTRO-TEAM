import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key missing." }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("image");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Image is required." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "image/jpeg";

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        inlineData: { mimeType, data: base64 },
      },
      {
        text: "Identify the medicine name from this image. Return JSON with keys: medicine, strength, form.",
      },
    ],
  });

  const text = response.text || "";
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  return NextResponse.json({
    text,
    data: parsed,
  });
}
