import { prisma } from "@/lib/prisma";

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
  if (!token || !chatId) return;

  await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  }).catch(() => null);
}

export async function notifyTelegramHelpers(patientId: string, text: string) {
  if (!patientId || !text) return;
  const helpers = await prisma.patientHelper.findMany({
    where: { patient_id: patientId },
  });
  if (!helpers.length) return;
  await Promise.all(
    helpers.map((helper) => sendTelegramMessage(helper.chat_id, text))
  );
}
