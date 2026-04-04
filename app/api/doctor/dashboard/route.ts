import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("abha_doctor_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = await verifyToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (payload?.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, department: true },
    });

    const today = startOfToday();

    const visits = await prisma.opdVisit.findMany({
      where: { created_at: { gte: today } },
      orderBy: { created_at: "desc" },
      include: {
        patient: { select: { name: true, age: true, gender: true } },
        summaries: { select: { id: true } },
      },
    });

    const summaries = await prisma.doctorSummary.findMany({
      where: { created_at: { gte: today } },
      orderBy: { created_at: "desc" },
      include: {
        patient: { select: { name: true, age: true, gender: true } },
        visit: { select: { created_at: true, token_number: true, visit_id: true } },
      },
    });

    const consultedToday = summaries.length;
    const queueToday = visits.filter((visit) => (visit.summaries || []).length === 0);

    const durations = summaries
      .map((summary) => {
        const visitTime = summary.visit?.created_at;
        if (!visitTime) return null;
        const diffMs = new Date(summary.created_at).getTime() - new Date(visitTime).getTime();
        return diffMs > 0 ? diffMs / 60000 : null;
      })
      .filter((val): val is number => typeof val === "number");

    const avgTime = durations.length
      ? Math.round((durations.reduce((acc, val) => acc + val, 0) / durations.length) * 10) / 10
      : null;

    return NextResponse.json({
      doctor,
      stats: {
        queueCount: queueToday.length,
        avgMinutes: avgTime,
        consultedToday,
      },
      queue: queueToday.slice(0, 10).map((visit) => ({
        id: visit.visit_id,
        token: visit.token_number,
        name: visit.name || visit.patient?.name || "Unknown",
        age: visit.age ?? visit.patient?.age ?? null,
        gender: visit.gender || visit.patient?.gender || null,
        department: visit.department,
        createdAt: visit.created_at,
      })),
      completed: summaries.slice(0, 10).map((summary) => ({
        id: summary.id,
        visitId: summary.visit_id,
        token: summary.visit?.token_number,
        name: summary.patient?.name || "Unknown",
        age: summary.patient?.age ?? null,
        gender: summary.patient?.gender ?? null,
        diagnosis: summary.diagnosis,
        createdAt: summary.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}
