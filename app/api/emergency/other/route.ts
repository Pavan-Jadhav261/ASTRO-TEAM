import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyTelegramHelpers } from "@/lib/telegram";
import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import fs from "fs/promises";
import os from "os";
import path from "path";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const formData = await request.formData();
  const audio = formData.get("audio");
  const patientId = String(formData.get("patientId") || "").trim();
  const location = String(formData.get("location") || "").trim();

  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID missing." }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const tempPath = path.join(os.tmpdir(), `emergency-${Date.now()}.webm`);
  await fs.writeFile(tempPath, buffer);

  let summary = "";
  try {
    const ai = new GoogleGenAI({ apiKey });
    const uploaded = await ai.files.upload({
      file: tempPath,
      config: { mimeType: audio.type || "audio/webm" },
    });

    const response = await ai.models.generateContent({
      model,
      contents: createUserContent([
        createPartFromUri(uploaded.uri, uploaded.mimeType || "audio/webm"),
        "Summarize this emergency description into one concise sentence of key symptoms.",
      ]),
    });

    summary = response.text || "Emergency reported by bystander.";
  } catch {
    summary = "Emergency reported by bystander.";
  } finally {
    await fs.unlink(tempPath).catch(() => null);
  }

  try {
    const alert = await prisma.emergencyAlert.create({
      data: {
        patient_id: patientId,
        reason: summary,
        summary,
        location: location || null,
        created_by: "other",
      },
    });

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    await notifyTelegramHelpers(
      patientId,
      `🚨 Emergency alert for ${patient?.name || "patient"}. Reported: ${summary}${
        location ? `\nLocation: https://www.google.com/maps?q=${location}` : ""
      }`
    );

    if (location) {
      const origin = new URL(request.url).origin;
      await fetch(`${origin}/api/notifications/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: Number(location.split(",")[0]),
          longitude: Number(location.split(",")[1]),
          title: "Emergency nearby",
          message: "A nearby emergency has been reported.",
        }),
      }).catch(() => null);
    }

    return NextResponse.json({ success: true, alertId: alert.id, summary });
  } catch {
    return NextResponse.json({ error: "Failed to create alert." }, { status: 500 });
  }
}
