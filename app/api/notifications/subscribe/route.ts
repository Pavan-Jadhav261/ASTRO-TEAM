import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const subscription = body.subscription;
  const latitude = typeof body.latitude === "number" ? body.latitude : null;
  const longitude = typeof body.longitude === "number" ? body.longitude : null;
  let patientId = body.patientId ? String(body.patientId) : null;

  const cookieStore = await cookies();
  const token = cookieStore.get("abha_patient_token")?.value;
  if (token) {
    const payload = await verifyToken(token).catch(() => null);
    if (payload?.role === "patient") {
      patientId = payload.sub;
    }
  }

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Subscription missing." }, { status: 400 });
  }

  try {
    const record = await prisma.notificationSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys?.p256dh || "",
        auth: subscription.keys?.auth || "",
        latitude,
        longitude,
        patient_id: patientId,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || "",
        auth: subscription.keys?.auth || "",
        latitude,
        longitude,
        patient_id: patientId,
      },
    });
    return NextResponse.json({ success: true, id: record.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Subscribe failed." }, { status: 500 });
  }
}
