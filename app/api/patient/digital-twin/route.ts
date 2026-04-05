import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";

type TwinInsights = {
  predictedOutcomes: string;
  measuresToTake: string;
  visitDoctor: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key missing." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const patientIdParam = String(body.patientId || "").trim();

  const cookieStore = await cookies();
  const token = cookieStore.get("abha_patient_token")?.value;
  const payload = token ? await verifyToken(token).catch(() => null) : null;
  const patientId = patientIdParam || payload?.sub || "";
  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      summaries: { orderBy: { created_at: "desc" }, take: 8 },
      prescriptions: { orderBy: { created_at: "desc" }, take: 10 },
    },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const summariesText = (patient.summaries || [])
    .map((s, idx) => `Summary ${idx + 1}: ${s.summary || ""}\nDiagnosis: ${s.diagnosis || ""}\nPlan: ${s.plan || ""}`)
    .join("\n\n");
  const prescriptionsText = (patient.prescriptions || [])
    .map((p) => `${p.medicine || ""} ${p.dosage || ""} ${p.frequency || ""} ${p.duration || ""}`.trim())
    .join("\n");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents:
      "You are a clinical assistant. Using the patient's recent summaries and prescriptions, produce short, plain-language insights for a digital twin.\n" +
      "Return the structured data via tool call only.\n\n" +
      `Summaries:\n${summariesText || "No summaries available."}\n\n` +
      `Prescriptions:\n${prescriptionsText || "No prescriptions available."}`,
    config: {
      tools: [
        {
          functionDeclarations: [
            {
              name: "digital_twin_insights",
              description: "Return structured insights for the patient's digital twin view.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  predictedOutcomes: { type: Type.STRING },
                  measuresToTake: { type: Type.STRING },
                  visitDoctor: { type: Type.STRING },
                },
                required: ["predictedOutcomes", "measuresToTake", "visitDoctor"],
              },
            },
          ],
        },
      ],
    },
  });

  const toolCalls = response.functionCalls || [];
  let insights: TwinInsights | null = null;
  for (const call of toolCalls) {
    if (call.name === "digital_twin_insights") {
      insights = call.args as TwinInsights;
    }
  }

  if (!insights) {
    return NextResponse.json({ error: "No insights returned." }, { status: 502 });
  }

  return NextResponse.json({ success: true, insights });
}
