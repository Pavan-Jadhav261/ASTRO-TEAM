import { NextResponse } from "next/server";
import { GoogleGenAI, Type, createPartFromUri, createUserContent } from "@google/genai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

type FunctionCall = {
  name: string;
  args?: Record<string, any>;
};

function makeTokenNumber() {
  return `T-${Math.floor(100 + Math.random() * 900)}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key missing." }, { status: 500 });
  }

  const formData = await request.formData();
  const audio = formData.get("audio");
  const patientId = String(formData.get("patientId") || "").trim();

  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID missing." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("abha_patient_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "patient" || payload.sub !== patientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const mimeType = audio.type || "audio/webm";
  const buffer = Buffer.from(await audio.arrayBuffer());
  const tempPath = path.join(os.tmpdir(), `patient-agent-${Date.now()}.webm`);
  await fs.writeFile(tempPath, buffer);

  let transcript = "";
  let reply = "";
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
        "Transcribe the patient request. Use tools to book visits or fetch summaries when asked. Respond with a concise assistant reply.",
      ]),
      config: {
        systemInstruction:
          "You are ABHA+ Patient Voice Agent. Return a short reply in plain text. Use tools for actions.",
        tools: [
          {
            functionDeclarations: [
              {
                name: "book_visit",
                description: "Book a new visit for the patient.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    symptoms: { type: Type.STRING },
                    department: { type: Type.STRING },
                  },
                  required: ["symptoms"],
                },
              },
              {
                name: "fetch_summaries",
                description: "Fetch recent doctor summaries for the patient.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    count: { type: Type.NUMBER },
                  },
                },
              },
            ],
          },
        ],
      },
    });

    transcript = response.text || "";
    reply = response.text || "";
    functionCalls = response.functionCalls || [];
  } catch (error: any) {
    await fs.unlink(tempPath).catch(() => null);
    return NextResponse.json(
      { error: error?.message || "Gemini request failed." },
      { status: 500 }
    );
  } finally {
    await fs.unlink(tempPath).catch(() => null);
  }

  let visitResult: any = null;
  let summaries: any[] = [];

  for (const call of functionCalls) {
    if (call.name === "book_visit") {
      const symptoms = String(call.args?.symptoms || "").trim();
      const department = String(call.args?.department || "General Medicine").trim();
      if (symptoms) {
        const visitId = `visit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const tokenNumber = makeTokenNumber();
        const roomNumber = `Counter ${Math.floor(1 + Math.random() * 6)}`;

        const patient = await prisma.patient.findUnique({ where: { id: patientId } });
        if (patient) {
          await prisma.opdVisit.create({
            data: {
              visit_id: visitId,
              token_number: tokenNumber,
              name: patient.name || "Patient",
              age: patient.age || 0,
              gender: patient.gender || "UNKNOWN",
              phone: patient.phone,
              symptoms,
              department,
              room_number: roomNumber,
              patient_id: patientId,
            },
          });
          visitResult = {
            visitId,
            tokenNumber,
            roomNumber,
            department,
            qrPayload: JSON.stringify({ visitId, tokenNumber }),
          };
        }
      }
    }

    if (call.name === "fetch_summaries") {
      const count = Number(call.args?.count || 5);
      summaries = await prisma.doctorSummary.findMany({
        where: { patient_id: patientId },
        orderBy: { created_at: "desc" },
        take: Math.min(10, Math.max(1, count)),
      });
    }
  }

  return NextResponse.json({
    transcript,
    reply,
    visit: visitResult,
    summaries,
  });
}
