import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "").trim();
  const name = String(body.name || "").trim();
  const age = Number(body.age || 0);
  const gender = String(body.gender || "").trim();

  if (!patientId || !name || !age || !gender) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: { name, age, gender },
    });
    return NextResponse.json({ success: true, patient });
  } catch {
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
