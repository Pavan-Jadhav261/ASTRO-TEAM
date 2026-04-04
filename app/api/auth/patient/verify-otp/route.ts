import { NextResponse } from "next/server";
import { twilioClient, twilioVerifySid } from "@/lib/twilio";
import { signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();
  const code = String(body.code || "").trim();

  if (!phone || !code) {
    return NextResponse.json({ error: "Phone and OTP are required." }, { status: 400 });
  }

  if (!twilioClient || !twilioVerifySid) {
    return NextResponse.json({ error: "Twilio not configured." }, { status: 500 });
  }

  try {
    const verification = await twilioClient.verify.v2
      .services(twilioVerifySid)
      .verificationChecks.create({ to: phone, code });

    if (verification.status !== "approved") {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 401 });
    }

    let patient = await prisma.patient.findUnique({ where: { phone } }).catch(() => null);
    if (!patient) {
      patient = await prisma.patient.create({ data: { phone } }).catch(() => null);
    }

    const needsProfile = !patient?.name || !patient?.age || !patient?.gender;

    const token = await signToken({ sub: patient?.id || phone, role: "patient" });
    const response = NextResponse.json({
      success: true,
      patientId: patient?.id || null,
      needsProfile,
    });
    response.cookies.set("abha_patient_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
