import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("abha_patient_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token).catch(() => null);
    if (!payload || payload.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const patientId = String(formData.get("patientId") || payload.sub || "").trim();
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }
    if (!patientId) {
      return NextResponse.json({ error: "Patient ID missing." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const fileName = `${Date.now()}_${safeName}`;
    const storagePath = path.join(process.cwd(), "uploads", fileName);
    await fs.writeFile(storagePath, buffer);

    const record = await prisma.patientReport.create({
      data: {
        patient_id: patientId,
        file_name: file.name,
        storage_path: storagePath,
        file_url: null,
      },
    });

    return NextResponse.json({ success: true, report: record });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to upload report." },
      { status: 500 }
    );
  }
}
