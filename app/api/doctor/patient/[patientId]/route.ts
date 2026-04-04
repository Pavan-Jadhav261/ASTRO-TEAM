import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        prescriptions: { orderBy: { created_at: "desc" }, take: 10 },
        summaries: { orderBy: { created_at: "desc" }, take: 5 },
        visits: { orderBy: { created_at: "desc" }, take: 5 },
      },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch patient." }, { status: 500 });
  }
}
