import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const alert = await prisma.emergencyAlert.findFirst({
      orderBy: { created_at: "desc" },
      include: { patient: true },
    });
    if (!alert) {
      return NextResponse.json({ error: "No alerts." }, { status: 404 });
    }
    return NextResponse.json(alert);
  } catch {
    return NextResponse.json({ error: "Failed to load alerts." }, { status: 500 });
  }
}
