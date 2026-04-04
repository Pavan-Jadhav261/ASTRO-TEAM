import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type PriceItem = {
  seller?: string;
  price?: number | string;
  currency?: string;
  url?: string;
};

function extractJson(text: string) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function parsePrice(value: any) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/[\d.]+/);
  if (!match) return null;
  const num = Number.parseFloat(match[0]);
  return Number.isFinite(num) ? num : null;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_MED_PRICE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GOOGLE_MED_PRICE_API_KEY" }, { status: 500 });
    }

    const body = await request.json();
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Medicine name is required" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const groundingTool = { googleSearch: {} };
    const config = { tools: [groundingTool] };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          text: `Find at least 7 websites selling a pack of ${name}. Return ONLY valid JSON array like: [{"seller":"", "price": 123, "currency":"INR", "url":"https://..."}]. Use numeric price values in INR (no symbols). Prefer current listings; include buyable URLs. Sort by increasing price in the JSON.`,
        },
      ],
      config,
    });

    const text = response.text || "";
    let items = extractJson(text) as PriceItem[] | null;
    if (!Array.isArray(items)) {
      items = [];
    }

    const normalized = items
      .map((item) => {
        const price = parsePrice(item?.price);
        return {
          seller: item?.seller || "",
          currency: "INR",
          url: item?.url || "",
          price: price ?? item?.price ?? null,
          priceValue: price,
        };
      })
      .filter((item) => item.url || item.seller || item.price)
      .sort((a, b) => {
        if (a.priceValue == null && b.priceValue == null) return 0;
        if (a.priceValue == null) return 1;
        if (b.priceValue == null) return -1;
        return a.priceValue - b.priceValue;
      });

    return NextResponse.json({
      success: true,
      items: normalized.map(({ priceValue, ...rest }) => rest),
      raw: text,
    });
  } catch (error) {
    console.error("Medicine price error:", error);
    return NextResponse.json({ error: "Failed to fetch medicine prices" }, { status: 500 });
  }
}
