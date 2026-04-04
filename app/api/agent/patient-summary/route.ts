import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAuthorized(request: Request) {
  const required = (process.env.AGENT_API_KEY || "").trim();
  if (!required) return true;
  const provided = request.headers.get("x-agent-key") || "";
  return required === provided;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "").trim();
  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId." }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        summaries: { orderBy: { created_at: "desc" }, take: 1 },
        prescriptions: { orderBy: { created_at: "desc" }, take: 5 },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    const latestSummary = patient.summaries[0];
    const prescriptions = (patient.prescriptions || []).map((rx) => ({
      medicineName: rx.medicine,
      dosage: rx.dosage || "",
      frequency: rx.frequency || "",
      duration: rx.duration || "",
    }));

    return NextResponse.json({
      summary: latestSummary?.summary || "No recent summary available.",
      diagnosis: latestSummary?.diagnosis || "Not specified",
      plan: latestSummary?.plan || "Not specified",
      prescriptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load summary." },
      { status: 500 }
    );
  }
}
