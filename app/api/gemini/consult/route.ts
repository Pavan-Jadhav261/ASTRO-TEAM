import { NextResponse } from "next/server";
import { GoogleGenAI, Type, createPartFromUri, createUserContent } from "@google/genai";
import fs from "fs/promises";
import os from "os";
import path from "path";

export const runtime = "nodejs";

type FunctionCall = {
  name: string;
  args?: Record<string, any>;
  id?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key missing." }, { status: 500 });
  }

  const formData = await request.formData();
  const audio = formData.get("audio");
  const notes = String(formData.get("notes") || "").trim();

  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const mimeType = audio.type || "audio/webm";
  const buffer = Buffer.from(await audio.arrayBuffer());
  const tempPath = path.join(os.tmpdir(), `consult-${Date.now()}.webm`);
  await fs.writeFile(tempPath, buffer);

  let transcript = "";
  let functionCalls: FunctionCall[] = [];

  try {
    const uploaded = await ai.files.upload({
      file: tempPath,
      config: { mimeType },
    });

    const response = await ai.models.generateContent({
      model,
      contents: createUserContent([
        createPartFromUri(uploaded.uri, uploaded.mimeType || mimeType),
        `Transcribe this consultation audio and extract only medical information. ${notes ? `Context: ${notes}` : ""}`,
      ]),
      config: {
        tools: [
          {
            functionDeclarations: [
              {
                name: "clinical_summary",
                description: "Extract the medical summary and key findings.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    chiefComplaint: { type: Type.STRING },
                    findings: { type: Type.STRING },
                    diagnosis: { type: Type.STRING },
                    plan: { type: Type.STRING },
                  },
                  required: ["chiefComplaint", "findings", "diagnosis", "plan"],
                },
              },
              {
                name: "extract_prescriptions",
                description: "Extract prescriptions mentioned in the conversation.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    prescriptions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          medicine: { type: Type.STRING },
                          dosage: { type: Type.STRING },
                          duration: { type: Type.STRING },
                        },
                        required: ["medicine"],
                      },
                    },
                  },
                  required: ["prescriptions"],
                },
              },
              {
                name: "health_radar_scores",
                description: "Estimate health radar scores (0-100).",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    cardio: { type: Type.NUMBER },
                    mental: { type: Type.NUMBER },
                    physical: { type: Type.NUMBER },
                    nutrition: { type: Type.NUMBER },
                    risk: { type: Type.NUMBER },
                  },
                  required: ["cardio", "mental", "physical", "nutrition", "risk"],
                },
              },
            ],
          },
        ],
      },
    });

    transcript = response.text || "";
    functionCalls = response.functionCalls || [];
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gemini request failed." },
      { status: 500 }
    );
  } finally {
    await fs.unlink(tempPath).catch(() => null);
  }

  const analysis: Record<string, any> = {};
  for (const call of functionCalls) {
    if (call.name === "clinical_summary") analysis.summary = call.args;
    if (call.name === "extract_prescriptions") analysis.prescriptions = call.args?.prescriptions || [];
    if (call.name === "health_radar_scores") analysis.radar = call.args;
  }

  return NextResponse.json({
    transcript,
    functionCalls,
    analysis,
  });
}
