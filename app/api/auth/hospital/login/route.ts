import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const hospitalId = String(body.hospitalId || "").trim();
  const password = String(body.password || "").trim();

  if (!hospitalId || !password) {
    return NextResponse.json({ error: "Missing credentials." }, { status: 400 });
  }

  const hospital = await prisma.hospital.findUnique({
    where: { hospital_id: hospitalId },
  });
  if (!hospital) {
    return NextResponse.json({ error: "Hospital not found.", code: "NOT_FOUND" }, { status: 404 });
  }
  if (!verifyPassword(password, hospital.password_hash)) {
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
