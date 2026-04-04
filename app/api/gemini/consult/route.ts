import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

type FunctionCall = {
  name: string;
  args?: Record<string, any>;
};

function runTool(call: FunctionCall) {
  if (call.name === "triage_summary") {
    const symptoms = String(call.args?.symptoms || "Not provided");
    return {
      summary: `Key symptoms: ${symptoms}.`,
      riskLevel: "medium",
      suggestedNextStep: "Proceed with vitals, ECG, and lab screening.",
    };
  }
  if (call.name === "recommend_tests") {
    return {
      tests: [
        "CBC",
        "ECG",
        "Chest X-ray",
        "Blood Pressure Monitoring",
      ],
    };
  }
  return { message: "No tool output." };
}

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

  const audioBuffer = await audio.arrayBuffer();
  const base64Audio = toBase64(audioBuffer);
  const mimeType = audio.type || "audio/webm";

  const prompt =
    "Transcribe the audio. Then call triage_summary and recommend_tests. " +
    "Use the transcript as symptoms. " +
    (notes ? `Context notes: ${notes}` : "");

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
        ],
      },
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: "triage_summary",
            description: "Summarize the clinical story and risk level.",
            parameters: {
              type: "OBJECT",
              properties: {
                symptoms: { type: "STRING" },
                duration: { type: "STRING" },
              },
              required: ["symptoms"],
            },
          },
          {
            name: "recommend_tests",
            description: "Suggest immediate diagnostic tests.",
            parameters: {
              type: "OBJECT",
              properties: {
                symptoms: { type: "STRING" },
              },
              required: ["symptoms"],
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(
    `${GEMINI_ENDPOINT}/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Gemini request failed." },
      { status: 500 }
    );
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const transcript = parts
    .filter((part: any) => part?.text)
    .map((part: any) => part.text)
    .join("\n");

  const calls = parts
    .filter((part: any) => part?.functionCall)
    .map((part: any) => part.functionCall);

  const toolResults = (calls as FunctionCall[]).map((call) => ({
    name: call.name,
    result: runTool(call),
  }));

  return NextResponse.json({
    transcript,
    functionCalls: calls,
    toolResults,
  });
}
