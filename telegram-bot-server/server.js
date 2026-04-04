const path = require("path");
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

// Load env from repo root
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
const PORT = Number(process.env.TELEGRAM_BOT_PORT || 5055);
const POLLING_ENABLED = ["1", "true", "yes"].includes(
  String(process.env.TELEGRAM_BOT_POLLING || "").toLowerCase()
);

app.use(express.json());

async function httpFetch(...args) {
  if (typeof fetch !== "undefined") {
    return fetch(...args);
  }
  const mod = await import("node-fetch");
  return mod.default(...args);
}

function parseStartPayload(text) {
  if (!text) return "";
  const parts = text.trim().split(" ");
  if (parts[0] !== "/start") return "";
  return parts[1] || "";
}

function normalizePatientId(raw) {
  let patientId = (raw || "").trim();
  if (patientId.startsWith("family_")) patientId = patientId.slice("family_".length);
  if (patientId.startsWith("patient_")) patientId = patientId.slice("patient_".length);
  if (patientId.startsWith("patient-")) patientId = patientId.slice("patient-".length);
  return patientId;
}

async function sendTelegramMessage(chatId, text) {
  if (!BOT_TOKEN || !chatId) return;
  await httpFetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  }).catch(() => null);
}

async function handleUpdate(update) {
  if (!update?.message?.text) {
    return;
  }

  const message = update.message;
  const rawText = String(message.text || "");
  const payload = parseStartPayload(rawText);
  console.log("Telegram update received:", {
    updateId: update.update_id,
    text: rawText,
    chatId: message.chat?.id,
  });

  const chatId = String(message.chat?.id || "").trim();
  if (!chatId) {
    return;
  }

  if (rawText.trim() === "/start" && !payload) {
    await sendTelegramMessage(
      chatId,
      "Please open the helper link from the patient dashboard to connect."
    );
    return;
  }

  if (!payload) {
    return;
  }

  const patientId = normalizePatientId(payload);
  if (!patientId) {
    await sendTelegramMessage(
      chatId,
      "Invalid helper link. Please use the link from the patient dashboard."
    );
    return;
  }

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

  await sendTelegramMessage(
    chatId,
    "You are now linked as a helper for this patient. You will receive emergency alerts here."
  );
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Telegram webhook
app.post("/telegram/webhook", async (req, res) => {
  try {
    const update = req.body;
    await handleUpdate(update);
    return res.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return res.json({ ok: true });
  }
});

// Emergency notification endpoint (called by Next.js)
app.post("/send-alert", async (req, res) => {
  try {
    const { patientId, message } = req.body || {};
    if (!patientId || !message) {
      return res.status(400).json({ error: "patientId and message are required" });
    }

    const helpers = await prisma.patientHelper.findMany({
      where: { patient_id: String(patientId) },
    });
    if (!helpers.length) {
      return res.json({ success: false, sent: 0 });
    }

    await Promise.all(
      helpers.map((helper) => sendTelegramMessage(helper.chat_id, message))
    );

    return res.json({ success: true, sent: helpers.length });
  } catch (error) {
    console.error("Telegram alert error:", error);
    return res.status(500).json({ error: "Failed to send alerts" });
  }
});

app.listen(PORT, () => {
  console.log(`Telegram bot server listening on http://localhost:${PORT}`);
  if (POLLING_ENABLED) {
    console.log("Telegram polling enabled.");
  } else {
    console.log("Telegram polling disabled (webhook mode).");
  }
});

async function startPolling() {
  if (!BOT_TOKEN) {
    console.error("BOT_TOKEN missing. Polling disabled.");
    return;
  }
  // Telegram requires webhook to be deleted before polling.
  try {
    await httpFetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    console.log("Telegram webhook cleared for polling.");
  } catch (err) {
    console.error("Failed to delete webhook:", err);
  }
  let offset = 0;
  let polling = false;

  setInterval(async () => {
    if (polling) return;
    polling = true;
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?timeout=20&offset=${offset}`;
      const res = await httpFetch(url);
      const data = await res.json();
      if (!data.ok) {
        console.error("Polling response error:", data);
      }
      if (data.ok && Array.isArray(data.result)) {
        if (data.result.length > 0) {
          console.log(`Polling received ${data.result.length} updates`);
        }
        for (const update of data.result) {
          offset = Math.max(offset, (update.update_id || 0) + 1);
          await handleUpdate(update);
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
    } finally {
      polling = false;
    }
  }, 3000);
}

if (POLLING_ENABLED) {
  startPolling();
}
