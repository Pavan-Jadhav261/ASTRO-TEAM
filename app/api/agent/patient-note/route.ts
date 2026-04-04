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
  const note = String(body.note || "").trim();

  if (!patientId || !note) {
    return NextResponse.json({ error: "Missing patientId or note." }, { status: 400 });
  }

  try {
    const latestVisit = await prisma.opdVisit.findFirst({
      where: { patient_id: patientId },
      orderBy: { created_at: "desc" },
    });

    await prisma.doctorSummary.create({
      data: {
        patient_id: patientId,
        visit_id: latestVisit?.visit_id ?? null,
        summary: note,
        chiefComplaint: note,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save note." },
      { status: 500 }
    );
  }
}
