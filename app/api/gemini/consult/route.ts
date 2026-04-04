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
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

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
        `Transcribe the consultation audio into plain text. Then call the tools to return structured medical outputs only. Do not output JSON in the text response. ${notes ? `Context: ${notes}` : ""}`,
      ]),
      config: {
        systemInstruction:
          "Return only a plain-text transcript in response.text. Use tool calls for summary, prescriptions, and radar scores.",
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

  let parsedText: any = null;
  if (!analysis.summary && transcript) {
    try {
      parsedText = JSON.parse(transcript);
    } catch {
      parsedText = null;
    }
    if (parsedText && typeof parsedText === "object") {
      const keys = ["chiefComplaint", "findings", "diagnosis", "plan"];
      const hasSummary = keys.some((key) => key in parsedText);
      if (hasSummary) {
        analysis.summary = {
          chiefComplaint: parsedText.chiefComplaint || "",
          findings: parsedText.findings || "",
          diagnosis: parsedText.diagnosis || "",
          plan: parsedText.plan || "",
        };
        transcript = parsedText.transcript || "";
      }
    }
  }

  // If tool calls were not returned, try a second pass using the transcript.
  if (!analysis.summary || !analysis.radar || !analysis.prescriptions) {
    try {
      const followUp = await ai.models.generateContent({
        model,
        contents: transcript || notes || "Consultation transcript not available.",
        config: {
          systemInstruction:
            "Use tool calls only. Extract summary, prescriptions, and radar scores from the transcript.",
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

      const followCalls: FunctionCall[] = followUp.functionCalls || [];
      for (const call of followCalls) {
        if (call.name === "clinical_summary" && !analysis.summary) analysis.summary = call.args;
        if (call.name === "extract_prescriptions" && !analysis.prescriptions) {
          analysis.prescriptions = call.args?.prescriptions || [];
        }
        if (call.name === "health_radar_scores" && !analysis.radar) analysis.radar = call.args;
      }
    } catch {
      // ignore follow-up failures
    }
  }

  if (!analysis.radar) {
    const text = `${transcript} ${notes}`.toLowerCase();
    const has = (term: string) => text.includes(term);
    const severityBoost = (terms: string[], value: number) =>
      terms.some((t) => has(t)) ? value : 0;

    let cardio = 55 + severityBoost(["chest pain", "breath", "palpitation", "shortness"], -10);
    let mental = 55 + severityBoost(["anxiety", "panic", "insomnia", "agitated"], -10);
    let physical = 60 + severityBoost(["vomiting", "weakness", "pain", "fatigue", "fever"], -10);
    let nutrition = 60 + severityBoost(["vomiting", "nausea", "loss of appetite"], -15);
    let risk = 40 + severityBoost(["chest pain", "breath", "bleeding", "seizure", "unconscious"], 40);
    risk = Math.max(risk, severityBoost(["fever", "vomiting"], 20) + 40);

    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
    analysis.radar = {
      cardio: clamp(cardio),
      mental: clamp(mental),
      physical: clamp(physical),
      nutrition: clamp(nutrition),
      risk: clamp(risk),
    };
  }

  return NextResponse.json({
    transcript,
    functionCalls,
    analysis,
  });
}
