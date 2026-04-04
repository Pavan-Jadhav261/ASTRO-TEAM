import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("abha_hospital_token");
  response.cookies.delete("abha_doctor_token");
  response.cookies.delete("abha_patient_token");
  return response;
}
