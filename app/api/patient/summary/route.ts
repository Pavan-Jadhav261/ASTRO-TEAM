import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId") || "";
  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        summaries: { orderBy: { created_at: "desc" }, take: 3 },
        prescriptions: { orderBy: { created_at: "desc" }, take: 5 },
        reports: { orderBy: { created_at: "desc" }, take: 5 },
      },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }
    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: "Failed to load summary." }, { status: 500 });
  }
}
