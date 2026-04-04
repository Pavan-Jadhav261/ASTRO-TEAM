import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const username = String(body.username || "").trim();
  const password = String(body.password || "").trim();
  const department = String(body.department || "").trim();

  if (!name || !username || !password || !department) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const existing = await prisma.doctor.findUnique({ where: { username } }).catch(() => null);
  if (existing) {
    return NextResponse.json({ error: "Doctor already exists." }, { status: 409 });
  }

  const doctor = await prisma.doctor.create({
    data: {
      name,
      username,
      department,
      password_hash: hashPassword(password),
    },
  });

  const token = await signToken({ sub: doctor.id, role: "doctor" });
  const response = NextResponse.json({ success: true, doctorId: doctor.id });
  response.cookies.set("abha_doctor_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
