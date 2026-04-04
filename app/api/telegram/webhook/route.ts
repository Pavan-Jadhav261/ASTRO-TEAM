import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseStartPayload(text: string) {
  if (!text) return "";
  const parts = text.trim().split(" ");
  if (parts[0] !== "/start") return "";
  return parts[1] || "";
}

export async function POST(request: Request) {
  const update = await request.json().catch(() => null);
  if (!update?.message?.text) {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const payload = parseStartPayload(String(message.text || ""));
  if (!payload) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat?.id || "").trim();
  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  const patientId = payload.trim();

  try {
    await prisma.patientHelper.upsert({
      where: { chat_id: chatId },
      create: {
        patient_id: patientId,
        chat_id: chatId,
        username: message.from?.username || null,
        first_name: message.from?.first_name || null,
      },
      update: {
        patient_id: patientId,
        username: message.from?.username || null,
        first_name: message.from?.first_name || null,
      },
    });

    const token = process.env.TELEGRAM_BOT_TOKEN || "";
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "You are now linked as a helper for this patient. You will receive emergency alerts here.",
        }),
      }).catch(() => null);
    }
  } catch {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
