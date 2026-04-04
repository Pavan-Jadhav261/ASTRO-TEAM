import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const hospitalId = String(body.hospitalId || "").trim();
  const password = String(body.password || "").trim();

  const expectedId = process.env.HOSPITAL_AUTH_ID || "";
  const expectedPassword = process.env.HOSPITAL_AUTH_PASSWORD || "";

  if (!hospitalId || !password) {
    return NextResponse.json({ error: "Missing credentials." }, { status: 400 });
  }

  if (!expectedId || !expectedPassword) {
    return NextResponse.json({ error: "Hospital credentials not configured." }, { status: 500 });
  }

  if (hospitalId !== expectedId || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid hospital credentials." }, { status: 401 });
  }

  const token = await signToken({ sub: hospitalId, role: "hospital" });
  const response = NextResponse.json({ success: true });
  response.cookies.set("abha_hospital_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
