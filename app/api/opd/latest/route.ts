import { NextResponse } from "next/server";
import { getLatestVisit } from "@/lib/store";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.opdVisit.findFirst({
      orderBy: { created_at: "desc" },
    });
    if (data) {
      return NextResponse.json({
        visitId: data.visit_id,
        tokenNumber: data.token_number,
        name: data.name,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        symptoms: data.symptoms,
        department: data.department,
        roomNumber: data.room_number,
        patientId: data.patient_id,
      });
    }
  } catch {
    // ignore and fall back
  }

  const record = getLatestVisit();
  if (!record) {
    return NextResponse.json({ error: "No visits yet." }, { status: 404 });
  }
  return NextResponse.json(record);
}
