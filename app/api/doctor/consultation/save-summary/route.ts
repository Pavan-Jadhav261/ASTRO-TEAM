import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("abha_doctor_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyToken(token).catch(() => null);
    if (!payload || payload.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const patientId = String(body.patientId || "").trim();
    const visitId = String(body.visitId || "").trim();
    const summary = String(body.summary || "").trim();
    const chiefComplaint = String(body.chiefComplaint || "").trim();
    const findings = String(body.findings || "").trim();
    const diagnosis = String(body.diagnosis || "").trim();
    const plan = String(body.plan || "").trim();
    const prescriptions = Array.isArray(body.prescriptions) ? body.prescriptions : [];
    const radar = body.radar || null;
    const allergies = Array.isArray(body.allergies) ? body.allergies : [];

    if (!patientId) {
      return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    const compressedSummary =
      summary ||
      [chiefComplaint, diagnosis, plan]
        .filter((item) => item && String(item).trim())
        .join(" · ")
        .slice(0, 220) ||
      "Summary not available";

    const savedSummary = await prisma.doctorSummary.create({
      data: {
        patient_id: patientId,
        visit_id: visitId || null,
        summary: compressedSummary,
        chiefComplaint,
        findings,
        diagnosis,
        plan,
        radar_scores: radar || null,
      },
    });

    if (prescriptions.length > 0) {
      await prisma.prescription.createMany({
        data: prescriptions.map((rx: any) => ({
          patient_id: patientId,
          visit_id: visitId || null,
          medicine: String(rx.medicine || rx.medicineName || "Medicine"),
          dosage: rx.dosage ? String(rx.dosage) : null,
          frequency: rx.frequency ? String(rx.frequency) : null,
          duration: rx.duration ? String(rx.duration) : null,
        })),
      });
    }

    if (allergies.length > 0) {
      const current = patient.allergies ? patient.allergies.split(",").map((a) => a.trim()) : [];
      const merged = Array.from(new Set([...current, ...allergies.map((a) => String(a).trim())])).filter(Boolean);
      await prisma.patient.update({
        where: { id: patientId },
        data: { allergies: merged.join(", ") },
      });
    }

    return NextResponse.json({ success: true, summaryId: savedSummary.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save summary." },
      { status: 500 }
    );
  }
}
