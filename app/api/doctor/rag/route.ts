import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs/promises";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

declare global {
  // eslint-disable-next-line no-var
  var ragStoreName: string | undefined;
  // eslint-disable-next-line no-var
  var ragStoreReady: boolean | undefined;
}

async function ensureFileSearchStore(ai: GoogleGenAI) {
  if (globalThis.ragStoreName && globalThis.ragStoreReady) {
    return globalThis.ragStoreName;
  }

  const filePath = path.join(process.cwd(), "public", "RAGDATA.txt");
  await fs.access(filePath);

  if (!globalThis.ragStoreName) {
    const store = await ai.fileSearchStores.create({
      config: { displayName: "abha-rag-store" },
    });
    globalThis.ragStoreName = store.name;
  }

  let operation = await ai.fileSearchStores.uploadToFileSearchStore({
    file: filePath,
    fileSearchStoreName: globalThis.ragStoreName,
    config: { displayName: "RAGDATA.txt" },
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    operation = await ai.operations.get({ operation });
  }

  globalThis.ragStoreReady = true;
  return globalThis.ragStoreName;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("abha_doctor_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyToken(token).catch(() => null);
    if (!payload || payload.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const question = String(body.question || "").trim();
    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

  const apiKey = process.env.GOOGLE_API_KEY || "";
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key missing." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const storeName = await ensureFileSearchStore(ai);

    const systemInstruction = [
      "You are ABHA+ Clinical Memory Assistant.",
      "Use only the MSF Clinical Guidelines (RAGDATA.txt) retrieved via file search.",
      "If the answer is not found in the document, say so clearly and suggest what to verify clinically.",
      "Provide concise, structured guidance for doctors with short bullet points.",
      "Use this exact format:",
      "Title line.",
      "Sections with labels: Key Differentials, Red Flags, Tests, First-line Management, Notes.",
      "Each section must be 2-5 bullets, each bullet under 18 words.",
      "When the document includes page numbers, cite them in the form 'Page X'.",
      "Do not fabricate dosages; if dosing is required and not present, state that dosing is not available in the document.",
    ].join(" ");

    const response = await ai.models.generateContent({
      model,
      contents: question,
      config: {
        systemInstruction,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeName],
            },
          },
        ],
      },
    });

    return NextResponse.json({
      text: response.text || "",
      citations: response.candidates?.[0]?.citationMetadata || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "RAG request failed." },
      { status: 500 }
    );
  }
}
