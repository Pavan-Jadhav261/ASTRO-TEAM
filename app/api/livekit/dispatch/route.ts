import { NextResponse } from "next/server";
import { AgentDispatchClient, RoomServiceClient } from "livekit-server-sdk";

function normalizeHost(rawUrl: string) {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("wss://")) return "https://" + rawUrl.slice(6);
  if (rawUrl.startsWith("ws://")) return "http://" + rawUrl.slice(5);
  return rawUrl;
}

function isPatientRoom(roomName: string) {
  return roomName.startsWith("elderly-assistant-") || roomName.startsWith("patient-");
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const roomName = body?.roomName;
    const requestedAgentName = body?.agentName;

    if (!roomName) {
      return NextResponse.json({ error: "roomName is required" }, { status: 400 });
    }

    const usePatientKeys = isPatientRoom(roomName);
    const patientKey = process.env.LIVEKIT_PATIENT_API_KEY;
    const patientSecret = process.env.LIVEKIT_PATIENT_API_SECRET;
    const patientUrl = process.env.LIVEKIT_PATIENT_URL || process.env.NEXT_PUBLIC_LIVEKIT_PATIENT_URL;
    const apiKey = (usePatientKeys ? patientKey : null) || process.env.LIVEKIT_API_KEY;
    const apiSecret = (usePatientKeys ? patientSecret : null) || process.env.LIVEKIT_API_SECRET;
    const rawUrl = (usePatientKeys ? patientUrl : null) || process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const agentName = requestedAgentName || process.env.LIVEKIT_AGENT_NAME || "hospital-agent";

    if (!apiKey || !apiSecret || !rawUrl) {
      return NextResponse.json({ error: "LiveKit server configuration is missing" }, { status: 500 });
    }

    const host = normalizeHost(rawUrl);
    const roomClient = new RoomServiceClient(host, apiKey, apiSecret);
    const agentClient = new AgentDispatchClient(host, apiKey, apiSecret);

    const rooms = await roomClient.listRooms([roomName]);
    if (!rooms || rooms.length === 0) {
      await roomClient.createRoom({ name: roomName });
    }

    const dispatch = await agentClient.createDispatch(roomName, agentName, {
      metadata: JSON.stringify({ source: "opd-frontend" }),
    });

    return NextResponse.json({ success: true, dispatched: true, dispatchId: dispatch.id });
  } catch (error) {
    console.error("LiveKit dispatch error:", error);
    return NextResponse.json({ error: "Failed to dispatch agent" }, { status: 500 });
  }
}
