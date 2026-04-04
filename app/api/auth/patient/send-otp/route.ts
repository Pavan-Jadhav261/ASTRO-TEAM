import { NextResponse } from "next/server";
import { twilioClient, twilioVerifySid } from "@/lib/twilio";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  if (!twilioClient || !twilioVerifySid) {
    return NextResponse.json({ error: "Twilio not configured." }, { status: 500 });
  }

  try {
    await twilioClient.verify.v2
      .services(twilioVerifySid)
      .verifications.create({ to: phone, channel: "sms" });

    return NextResponse.json({ success: true, phone });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to send OTP." },
      { status: 500 }
    );
  }
}
