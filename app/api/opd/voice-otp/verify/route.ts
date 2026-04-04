import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();
  const code = String(body.code || "").trim();

  if (!phone || !code) {
    return NextResponse.json({ error: "Phone and code are required." }, { status: 400 });
  }

  const ok = verifyOtp(phone, code);
  if (!ok) {
    return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
