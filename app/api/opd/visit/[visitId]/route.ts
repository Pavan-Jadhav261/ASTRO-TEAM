import { NextResponse } from "next/server";
import { getVisit } from "@/lib/store";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { visitId } = await params;
  try {
    const data = await prisma.opdVisit.findUnique({
      where: { visit_id: visitId },
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

  const record = getVisit(visitId);
  if (!record) {
    return NextResponse.json({ error: "Visit not found." }, { status: 404 });
  }

  return NextResponse.json(record);
}
