import { NextResponse } from "next/server";
import { saveVisit } from "@/lib/store";
import { prisma } from "@/lib/prisma";

function makeTokenNumber() {
  return `T-${Math.floor(100 + Math.random() * 900)}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const payload = {
    name: String(body.name || "").trim(),
    age: Number(body.age || 0),
    gender: String(body.gender || "").trim(),
    phone: String(body.phone || "").trim(),
    symptoms: String(body.symptoms || "").trim(),
    department: String(body.department || "").trim() || "General Medicine",
  };

  if (!payload.name || !payload.phone || !payload.symptoms) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const visitId = `visit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const tokenNumber = makeTokenNumber();
  const roomNumber = `Counter ${Math.floor(1 + Math.random() * 6)}`;
  const record = {
    visitId,
    tokenNumber,
    roomNumber,
    ...payload,
    createdAt: Date.now(),
  };

  let patientId: string | null = null;
  try {
    const patient = await prisma.patient.upsert({
      where: { phone: payload.phone },
      create: {
        phone: payload.phone,
        name: payload.name,
        age: payload.age,
        gender: payload.gender,
      },
      update: {
        name: payload.name,
        age: payload.age,
        gender: payload.gender,
      },
    });
    patientId = patient.id;

    await prisma.opdVisit.create({
      data: {
        visit_id: visitId,
        token_number: tokenNumber,
        name: payload.name,
        age: payload.age,
        gender: payload.gender,
        phone: payload.phone,
        symptoms: payload.symptoms,
        department: payload.department,
        room_number: roomNumber,
        patient_id: patient.id,
      },
    });
  } catch {
    // Ignore insert failure and fall back to in-memory.
  }

  saveVisit(record);

  return NextResponse.json({
    visitId,
    tokenNumber,
    department: payload.department,
    roomNumber,
    patientId,
    patient: payload,
    qrPayload: JSON.stringify({ visitId, tokenNumber }),
  });
}
