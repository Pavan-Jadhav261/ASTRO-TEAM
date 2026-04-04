import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyTelegramHelpers } from "@/lib/telegram";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "").trim();
  const reason = String(body.reason || "").trim() || "Emergency request";
  const location = String(body.location || "").trim();
  const symptoms = String(body.symptoms || "").trim();
  const summary = String(body.summary || "").trim();
  const createdBy = String(body.createdBy || "self").trim();

  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    const alert = await prisma.emergencyAlert.create({
      data: {
        patient_id: patientId,
        reason,
        location: location || null,
        symptoms: symptoms || null,
        summary: summary || null,
        created_by: createdBy || null,
      },
    });

    const patientName = patient?.name || "patient";
    const locationLine = location
      ? `Live location: https://www.google.com/maps?q=${location}`
      : "Live location unavailable.";
    await notifyTelegramHelpers(
      patientId,
      `Emergency for ${patientName}\nReason: ${reason}\n${locationLine}`
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
    return NextResponse.json({ success: true, alertId: alert.id });
  } catch {
    return NextResponse.json({ error: "Failed to create alert." }, { status: 500 });
  }
}
