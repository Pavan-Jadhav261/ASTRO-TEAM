import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveVisit } from "@/lib/store";

function makeTokenNumber() {
  return `T-${Math.floor(100 + Math.random() * 900)}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "").trim();
  const symptoms = String(body.symptoms || "").trim();
  const department = String(body.department || "General Medicine").trim();

  if (!patientId || !symptoms) {
    return NextResponse.json({ error: "Missing patient or symptoms." }, { status: 400 });
  }

  const visitId = `visit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const tokenNumber = makeTokenNumber();
  const roomNumber = `Counter ${Math.floor(1 + Math.random() * 6)}`;

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

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
  } catch (error: any) {
    saveVisit({
      visitId,
      tokenNumber,
      roomNumber,
      name: "Patient",
      age: 0,
      gender: "UNKNOWN",
      phone: "UNKNOWN",
      symptoms,
      department,
      createdAt: Date.now(),
    });
  }

  return NextResponse.json({
    visitId,
    tokenNumber,
    roomNumber,
    department,
    qrPayload: JSON.stringify({ visitId, tokenNumber }),
  });
}
