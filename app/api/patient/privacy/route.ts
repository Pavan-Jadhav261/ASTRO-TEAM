import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("abha_patient_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token).catch(() => null);
    if (!payload || payload.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const patientId = String(body.patientId || payload.sub || "").trim();
    if (!patientId) {
      return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
    }

    if (action === "delete_summary") {
      const summaryId = String(body.summaryId || "").trim();
      if (!summaryId) {
        return NextResponse.json({ error: "Missing summaryId." }, { status: 400 });
      }
      await prisma.doctorSummary.deleteMany({
        where: { id: summaryId, patient_id: patientId },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_report") {
      const reportId = String(body.reportId || "").trim();
      if (!reportId) {
        return NextResponse.json({ error: "Missing reportId." }, { status: 400 });
      }
      await prisma.patientReport.deleteMany({
        where: { id: reportId, patient_id: patientId },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_profile") {
      await prisma.doctorSummary.deleteMany({ where: { patient_id: patientId } });
      await prisma.patientReport.deleteMany({ where: { patient_id: patientId } });
      await prisma.prescription.deleteMany({ where: { patient_id: patientId } });
      await prisma.opdVisit.deleteMany({ where: { patient_id: patientId } });
      await prisma.patient.delete({ where: { id: patientId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Privacy action failed." },
      { status: 500 }
    );
  }
}
