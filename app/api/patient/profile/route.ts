import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("abha_patient_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "patient") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId") || payload.sub;
  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }
    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "").trim();
  const name = String(body.name || "").trim();
  const age = Number(body.age || 0);
  const gender = String(body.gender || "").trim();
  const guardians = Array.isArray(body.guardians) ? body.guardians.map((g: any) => String(g)) : null;

  if (!patientId || !name || !age || !gender) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: { name, age, gender, guardians: guardians || undefined },
    });
    return NextResponse.json({ success: true, patient });
  } catch {
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
