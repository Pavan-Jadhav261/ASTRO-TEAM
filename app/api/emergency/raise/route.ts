import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "").trim();
  const reason = String(body.reason || "").trim() || "Emergency request";
  const location = String(body.location || "").trim();

  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
  }

  try {
    const alert = await prisma.emergencyAlert.create({
      data: {
        patient_id: patientId,
        reason,
        location: location || null,
      },
    });
    return NextResponse.json({ success: true, alertId: alert.id });
  } catch {
    return NextResponse.json({ error: "Failed to create alert." }, { status: 500 });
  }
}
