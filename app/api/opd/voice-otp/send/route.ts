import { NextResponse } from "next/server";
import { saveOtp } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();

  if (!phone) {
    return NextResponse.json({ error: "Phone is required." }, { status: 400 });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  saveOtp(phone, code);

  return NextResponse.json({ phone });
}
