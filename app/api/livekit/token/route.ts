import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

function normalizeUrl(rawUrl: string) {
  let livekitUrl = rawUrl.trim();
  if (livekitUrl.startsWith("https://")) {
    livekitUrl = livekitUrl.replace("https://", "wss://");
  }
  if (livekitUrl.startsWith("http://")) {
    livekitUrl = livekitUrl.replace("http://", "ws://");
  }
  return livekitUrl;
}

async function buildToken(roomName: string, identity: string) {
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
  const rawUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || "";
  const livekitUrl = normalizeUrl(rawUrl);

  if (!apiKey || !apiSecret || !livekitUrl) {
    return {
      error: "Missing LiveKit environment variables.",
      status: 500,
      payload: null as null | Record<string, unknown>,
    };
  }

  const token = new AccessToken(apiKey, apiSecret, { identity, name: identity });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  const jwt = await token.toJwt();
  return {
    error: null,
    status: 200,
    payload: {
      token: jwt,
      url: livekitUrl,
      roomName,
      identity,
    },
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomName = searchParams.get("roomName") || `opd-${Date.now()}`;
  const identity = searchParams.get("participantName") || `kiosk-${Math.random().toString(36).slice(2, 8)}`;

  const result = await buildToken(roomName, identity);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomName = body.roomName || `opd-${Date.now()}`;
  const identity = body.identity || `kiosk-${Math.random().toString(36).slice(2, 8)}`;

  const result = await buildToken(roomName, identity);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
