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
    const reminders = await prisma.medicineReminder.findMany({
      where: { 
        patient_id: patientId,
        active: true 
      },
      orderBy: { created_at: "desc" },
    });
    
    return NextResponse.json(reminders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load reminders." }, { status: 500 });
  }
}
