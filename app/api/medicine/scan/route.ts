import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MED_IMAGE_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

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
        text: "Identify the medicine name from this image. Use the tool call to return structured data only.",
      },
    ],
    config: {
      tools: [
        {
          functionDeclarations: [
            {
              name: "extract_medicine",
              description: "Extract the medicine name, strength, and form from the image.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  medicine: { type: Type.STRING },
                  strength: { type: Type.STRING },
                  form: { type: Type.STRING },
                },
                required: ["medicine"],
              },
            },
          ],
        },
      ],
    },
  });

  const text = response.text || "";
  const functionCalls = response.functionCalls || [];
  let parsed: any = null;

  for (const call of functionCalls) {
    if (call.name === "extract_medicine") {
      parsed = call.args || null;
    }
  }

  if (!parsed && text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  return NextResponse.json({
    text,
    data: parsed,
  });
}
