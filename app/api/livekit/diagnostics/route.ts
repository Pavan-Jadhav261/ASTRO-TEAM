import { NextResponse } from "next/server";

export async function GET() {
  const url = (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "").trim();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();

  return NextResponse.json({
    livekitUrlPresent: Boolean(url),
    livekitUrlScheme: url.startsWith("wss://") ? "wss" : url.startsWith("https://") ? "https" : "other",
    livekitUrlHost: url ? url.replace(/^wss?:\/\//, "") : "",
    apiKeyLength: apiKey.length,
    apiSecretLength: apiSecret.length,
  });
}
