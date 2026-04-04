"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  LocalAudioTrack,
  RemoteAudioTrack,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import {
  ArrowLeft,
  Mic,
  MessageSquare,
  Phone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AgentMessage = {
  action: string;
  data: Record<string, any>;
};

export default function PatientVoiceAgentPage() {
  const roomRef = useRef<Room | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const agentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<"idle" | "connecting" | "live">("idle");
  const [agentState, setAgentState] = useState<"idle" | "listening" | "speaking">("idle");
  const [level, setLevel] = useState(0);
  const [agentConnected, setAgentConnected] = useState(false);
  const agentConnectedRef = useRef(false);
  const [agentIdentity, setAgentIdentity] = useState<string | null>(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tokenCard, setTokenCard] = useState<any>(null);
  const [summaryCard, setSummaryCard] = useState<string | null>(null);
  const [needsAudioStart, setNeedsAudioStart] = useState(false);
  const connectTimeoutRef = useRef<number | null>(null);

  const bars = useMemo(() => Array.from({ length: 14 }, () => 10), []);
  const [barHeights, setBarHeights] = useState<number[]>(bars);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
      analyserRef.current?.disconnect();
      audioCtxRef.current?.close();
      roomRef.current?.disconnect();
    };
  }, []);

  const updateLevel = (data: Uint8Array) => {
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length / 255;
    const nextLevel = Math.min(1, avg * 2);
    setLevel(nextLevel);
    setAgentState(nextLevel > 0.18 ? "speaking" : "listening");
    setBarHeights((prev) =>
      prev.map((_, index) => 8 + Math.round((data[index % data.length] / 255) * 28))
    );
  };

  const setupAnalyser = (track: LocalAudioTrack | RemoteAudioTrack) => {
    if (audioCtxRef.current) return;
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const source = audioCtx.createMediaStreamSource(
      new MediaStream([track.mediaStreamTrack])
    );
    source.connect(analyser);
    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(data);
      updateLevel(data);
      animationRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const handleAgentData = async (payload: Uint8Array) => {
    try {
      const message: AgentMessage = JSON.parse(new TextDecoder().decode(payload));
      if (message.action === "appointment_booked") {
        setTokenCard(message.data);
      }
      if (message.action === "emergency_sent") {
        setSummaryCard(`Emergency sent: ${message.data?.reason || ""}`);
      }
    } catch {
      // ignore
    }
  };

  const attachAgentAudio = (track: RemoteAudioTrack) => {
    if (!agentAudioRef.current) return;
    track.attach(agentAudioRef.current);
    agentAudioRef.current.muted = false;
    agentAudioRef.current.volume = 1;
    agentAudioRef.current.play().catch(() => null);
    setupAnalyser(track);
  };

  const startVoice = async () => {
    if (status !== "idle") return;
    setStatus("connecting");
    setError(null);
    setTokenCard(null);
    setSummaryCard(null);
    setNeedsAudioStart(false);

    try {
      const patientId = localStorage.getItem("abha_patient_id") || "patient";
      const roomName = `elderly-assistant-${patientId}`;
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, identity: `patient-${patientId.slice(0, 6)}` }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to fetch LiveKit token");
      }

      await fetch("/api/livekit/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to dispatch LiveKit agent.");
        }
      });

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.DataReceived, (payloadBytes) => {
        handleAgentData(payloadBytes);
      });

      room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        if (track.kind === Track.Kind.Audio) {
          attachAgentAudio(track as RemoteAudioTrack);
          if (participant.identity !== room.localParticipant.identity) {
            setAgentConnected(true);
            agentConnectedRef.current = true;
            setAgentIdentity(participant.identity);
          }
        }
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setNeedsAudioStart(!room.canPlaybackAudio);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach();
          if (participant.identity !== room.localParticipant.identity) {
            setAgentConnected(false);
            agentConnectedRef.current = false;
            setAgentIdentity(null);
          }
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        if (participant.identity !== room.localParticipant.identity) {
          setAgentConnected(true);
          agentConnectedRef.current = true;
          setAgentIdentity(participant.identity);
        }
        setParticipantsCount((room.participants?.size ?? 0) + 1);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        if (participant.identity !== room.localParticipant.identity) {
          setAgentConnected(false);
          agentConnectedRef.current = false;
          setAgentIdentity(null);
        }
        setParticipantsCount((room.participants?.size ?? 0) + 1);
      });

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.kind === Track.Kind.Audio && publication.track) {
          setupAnalyser(publication.track as LocalAudioTrack);
        }
      });

      await room.connect(payload.url, payload.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setParticipantsCount((room.participants?.size ?? 0) + 1);
      if (!room.canPlaybackAudio) {
        room.startAudio().catch(() => setNeedsAudioStart(true));
      }

      setStatus("live");
      setAgentState("listening");

      if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = window.setTimeout(() => {
        if (!agentConnectedRef.current) {
          setError("Agent did not connect. Ensure agents/agent.py is running and LIVEKIT_* keys match.");
        }
      }, 8000);

      const summaryRes = await fetch(`/api/agent/patient-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData?.summary) {
          setSummaryCard(summaryData.summary);
        }
      }
    } catch (err: any) {
      setStatus("idle");
      setAgentState("idle");
      setAgentConnected(false);
      setError(err?.message || "LiveKit connection failed.");
    }
  };

  const stopVoice = async () => {
    roomRef.current?.disconnect();
    setStatus("idle");
    setAgentState("idle");
    setAgentConnected(false);
    agentConnectedRef.current = false;
    setNeedsAudioStart(false);
    if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
  };

  return (
    <main className="min-h-screen abha-mesh neo-bg px-6 py-6">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patient/dashboard" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
            <ArrowLeft size={18} />
          </Link>
          <AbhaLogo />
        </div>
        <ThemeToggle />
      </header>

      <section className="mx-auto mt-6 grid w-full max-w-5xl gap-4 lg:grid-cols-[1.2fr,1fr]">
        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Voice Agent</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
              <span>Status</span>
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${agentConnected ? "bg-emerald-400" : "bg-slate-500"}`} />
                {status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Idle"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[color:var(--text-secondary)]">
              <span>Participants</span>
              <span>{participantsCount}</span>
            </div>
            {agentIdentity && (
              <div className="text-xs text-[color:var(--text-secondary)]">
                Agent: {agentIdentity}
              </div>
            )}

            <div className="relative grid place-items-center rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8">
              <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.35),transparent_60%)]" />
              <div className="relative flex items-end gap-2">
                {barHeights.map((height, index) => (
                  <motion.span
                    key={index}
                    className="w-2 rounded-full bg-gradient-to-t from-[color:var(--accent-primary)] to-[color:var(--accent-secondary)]"
                    animate={{ height }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    style={{ height }}
                  />
                ))}
              </div>
              <div className="absolute bottom-4 text-xs text-[color:var(--text-secondary)]">
                {agentState === "speaking" ? "Agent speaking" : "Listening"}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={startVoice} disabled={status !== "idle"}>
                <Mic size={16} />
                Start Agent
              </Button>
              <Button variant="secondary" onClick={stopVoice} disabled={status === "idle"}>
                Stop Agent
              </Button>
              {needsAudioStart && (
                <Button
                  variant="secondary"
                  onClick={() => roomRef.current?.startAudio().catch(() => null)}
                >
                  Enable Audio
                </Button>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <audio ref={agentAudioRef} className="hidden" autoPlay playsInline />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Latest Guidance</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[color:var(--text-secondary)]">
              {summaryCard || "Ask about your last visit, medicines, or book a new visit."}
            </CardContent>
          </Card>

          {tokenCard && (
            <Card className="neo-card">
              <CardHeader>
                <CardTitle>Token Created</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[color:var(--text-secondary)]">
                <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
                  <Sparkles size={16} /> Token {tokenCard.tokenNumber}
                </div>
                <div className="mt-2">Department: {tokenCard.department}</div>
                <div>Room: {tokenCard.roomNumber}</div>
              </CardContent>
            </Card>
          )}

          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-[color:var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} /> Ask: "Explain my last summary"
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} /> Ask: "Book a visit for fever"
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
