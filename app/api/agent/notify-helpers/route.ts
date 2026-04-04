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
  const message = String(body.message || "").trim();

  if (!patientId || !message) {
    return NextResponse.json({ error: "Missing patientId or message." }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { guardians: true },
    });

    return NextResponse.json({
      success: true,
      delivered: (patient?.guardians || []).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to notify helpers." },
      { status: 500 }
    );
  }
}
