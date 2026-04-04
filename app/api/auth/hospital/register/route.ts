import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const hospitalId = String(body.hospitalId || "").trim();
  const name = String(body.name || "").trim();
  const address = String(body.address || "").trim();
  const password = String(body.password || "").trim();

  if (!hospitalId || !name || !password) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const existing = await prisma.hospital.findUnique({
    where: { hospital_id: hospitalId },
  });
  if (existing) {
    return NextResponse.json({ error: "Hospital already registered." }, { status: 409 });
  }

  const hospital = await prisma.hospital.create({
    data: {
      hospital_id: hospitalId,
      name,
      address: address || null,
      password_hash: hashPassword(password),
    },
  });

  const token = await signToken({ sub: hospital.hospital_id, role: "hospital" });
  const response = NextResponse.json({ success: true, hospitalId: hospital.hospital_id });
  response.cookies.set("abha_hospital_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
