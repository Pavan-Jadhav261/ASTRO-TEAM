import { NextResponse } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function POST(request: Request) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys missing." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const title = String(body.title || "Emergency Alert");
  const message = String(body.message || "Emergency nearby.");

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid location." }, { status: 400 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const subs = await prisma.notificationSubscription.findMany();
  const nearby = subs.filter((sub) => {
    if (sub.latitude == null || sub.longitude == null) return false;
    return distanceMeters(latitude, longitude, sub.latitude, sub.longitude) <= 200;
  });

  const payload = JSON.stringify({
    title,
    body: message,
    url: `https://www.google.com/maps?q=${latitude},${longitude}`,
  });

  await Promise.all(
    nearby.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      ).catch(() => null)
    )
  );

  return NextResponse.json({ success: true, sent: nearby.length });
}
