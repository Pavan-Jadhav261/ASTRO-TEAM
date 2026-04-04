import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const HOSPITAL_COOKIE = "abha_hospital_token";
const DOCTOR_COOKIE = "abha_doctor_token";
const PATIENT_COOKIE = "abha_patient_token";

async function requireAuth(request: NextRequest, cookieName: string, redirectTo: string) {
  const token = request.cookies.get(cookieName)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
  try {
    await verifyToken(token);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    response.cookies.delete(cookieName);
    return response;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/hospital") && !pathname.startsWith("/login")) {
    return requireAuth(request, HOSPITAL_COOKIE, "/login/hospital");
  }

  if (pathname.startsWith("/doctor") && !pathname.startsWith("/login")) {
    return requireAuth(request, DOCTOR_COOKIE, "/login/doctor");
  }

  if (pathname.startsWith("/patient") && !pathname.startsWith("/login")) {
    return requireAuth(request, PATIENT_COOKIE, "/login/patient");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hospital/:path*", "/doctor/:path*", "/patient/:path*"],
};
