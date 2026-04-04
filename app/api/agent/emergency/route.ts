import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyTelegramHelpers } from "@/lib/telegram";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "").trim();
  const reason = String(body.reason || "").trim() || "Emergency alert";

  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
  }

  try {
    let location = "";
    const sub = await prisma.notificationSubscription.findFirst({
      where: { patient_id: patientId },
      orderBy: { updated_at: "desc" },
    });
    if (sub?.latitude != null && sub?.longitude != null) {
      location = `${sub.latitude}, ${sub.longitude}`;
    }

    const alert = await prisma.emergencyAlert.create({
      data: {
        patient_id: patientId,
        reason,
        summary: reason,
        location: location || null,
        created_by: "agent",
      },
    });

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    await notifyTelegramHelpers(
      patientId,
      `🚨 Emergency alert for ${patient?.name || "patient"}. Reason: ${reason}${
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
          message: reason,
        }),
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      alertId: alert.id,
      mapLink: location ? `https://www.google.com/maps?q=${location}` : "",
    });
  } catch {
    return NextResponse.json({ error: "Failed to create alert." }, { status: 500 });
  }
}
