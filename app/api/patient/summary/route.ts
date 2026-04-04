import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientIdParam = searchParams.get("patientId") || "";
  const cookieStore = await cookies();
  const token = cookieStore.get("abha_patient_token")?.value;
  const payload = token ? await verifyToken(token).catch(() => null) : null;
  const patientId = patientIdParam || payload?.sub || "";
  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        visits: { orderBy: { created_at: "desc" }, take: 10 },
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
