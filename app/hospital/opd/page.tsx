"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  CheckCircle2,
  Globe,
  Loader2,
  Mic,
  MessageSquare,
  Phone,
  Printer,
  User,
  Volume2,
} from "lucide-react";
import {
  LocalAudioTrack,
  RemoteAudioTrack,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type AgentMessage = {
  action: string;
  data: Record<string, any>;
};

type PatientDetails = {
  name: string;
  age: number;
  gender: string;
  phone: string;
  symptoms: string;
  department: string;
};

export default function OpdKioskPage() {
  const roomRef = useRef<Room | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const agentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<"idle" | "connecting" | "live">("idle");
  const [agentState, setAgentState] = useState<"idle" | "listening" | "speaking">("idle");
  const [level, setLevel] = useState(0);
  const [details, setDetails] = useState<PatientDetails | null>(null);
  const [otpState, setOtpState] = useState("Waiting for details");
  const [registration, setRegistration] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [agentConnected, setAgentConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bars = useMemo(() => Array.from({ length: 12 }, () => 12), []);
  const [barHeights, setBarHeights] = useState<number[]>(bars);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      analyserRef.current?.disconnect();
      audioCtxRef.current?.close();
      roomRef.current?.disconnect();
    };
  }, []);

  const updateLevel = (data: Uint8Array) => {
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length / 255;
    const nextLevel = Math.min(1, avg * 2);
    setLevel(nextLevel);
    setAgentState(nextLevel > 0.2 ? "speaking" : "listening");
    setBarHeights((prev) =>
      prev.map((_, index) => 8 + Math.round((data[index % data.length] / 255) * 26))
    );
  };

  const setupAnalyser = (track: LocalAudioTrack) => {
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

  const handleAgentData = (payload: Uint8Array) => {
    try {
      const message: AgentMessage = JSON.parse(new TextDecoder().decode(payload));
      if (message.action === "otp_sent") {
        setOtpState("OTP sent. Say the code.");
      }
      if (message.action === "otp_invalid") {
        setOtpState("OTP invalid. Please repeat.");
      }
      if (message.action === "confirmation_required") {
        setDetails(message.data as PatientDetails);
        setOtpState("Confirm details on screen.");
      }
      if (message.action === "registration_ready") {
        setRegistration(message.data);
        setOtpState("Registration complete.");
      }
    } catch {
      // ignore invalid payload
    }
  };

  const attachAgentAudio = (track: RemoteAudioTrack) => {
    if (!agentAudioRef.current) return;
    track.attach(agentAudioRef.current);
  };

  const startVoice = async () => {
    if (status !== "idle") return;
    setStatus("connecting");
    setError(null);

    try {
      const roomName = `opd-${Date.now()}`;
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to fetch LiveKit token");
      }

      await fetch("/api/livekit/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
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
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach();
          if (participant.identity !== room.localParticipant.identity) {
            setAgentConnected(false);
          }
        }
      });

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.kind === Track.Kind.Audio && publication.track) {
          setupAnalyser(publication.track as LocalAudioTrack);
        }
      });

      await room.connect(payload.url, payload.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setStatus("live");
      setAgentState("listening");
    } catch (err) {
      setStatus("idle");
      setAgentState("idle");
      setAgentConnected(false);
      setError("LiveKit connection failed. Check API key/secret or URL.");
    }
  };

  const stopVoice = async () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setStatus("idle");
    setAgentState("idle");
    setLevel(0);
    setAgentConnected(false);
  };

  useEffect(() => {
    if (!registration?.qrPayload) return;
    QRCode.toDataURL(registration.qrPayload, { margin: 1, width: 220 }).then((url) => {
      setQrUrl(url);
    });
  }, [registration]);

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-8">
      <audio ref={agentAudioRef} autoPlay playsInline />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[color:var(--accent-primary)] shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
            Live OPD Kiosk
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto mt-8 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="flex flex-col gap-6">
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Live Voice Agent</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="relative">
                <div
                  className="neo-orb"
                  style={{
                    transform: `scale(${1 + level * 0.06})`,
                    transition: "transform 0.2s ease",
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="accent">{agentState.toUpperCase()}</Badge>
                {status === "idle" ? (
                  <Button size="sm" onClick={startVoice}>
                    <Mic size={14} />
                    Start Voice
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={stopVoice}>
                    Stop
                  </Button>
                )}
                <Badge variant="default" className="gap-2">
                  <Volume2 size={12} />
                  {agentConnected ? "Agent Audio Live" : "Awaiting Agent"}
                </Badge>
              </div>
              <div className="flex items-end gap-2">
                {barHeights.map((height, index) => (
                  <span
                    key={index}
                    className="w-[3px] rounded-full bg-gradient-to-t from-[color:var(--accent-primary)] to-[color:var(--accent-secondary)]"
                    style={{ height }}
                  />
                ))}
              </div>
              <p className="text-center text-sm text-[color:var(--text-secondary)]">
                Voice input and agent responses are streamed in real time.
              </p>
            </CardContent>
          </Card>

          {error && (
            <Card className="neo-card border border-[color:var(--accent-critical)]/40">
              <CardContent className="text-sm text-[color:var(--accent-critical)]">
                {error}
              </CardContent>
            </Card>
          )}

          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Language</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-xs">
              {["Hindi", "English", "Tamil", "Telugu"].map((lang) => (
                <span
                  key={lang}
                  className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2"
                >
                  <Globe size={12} className="mr-2 inline-block" />
                  {lang}
                </span>
              ))}
            </CardContent>
          </Card>

          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Live Status</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3 text-sm text-[color:var(--text-secondary)]">
              {status === "connecting" && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === "live" && <span className="h-2 w-2 rounded-full bg-[color:var(--accent-primary)]" />}
              {status === "idle" && <span className="h-2 w-2 rounded-full bg-[color:var(--border)]" />}
              {otpState}
            </CardContent>
          </Card>
        </div>

        <Card className="neo-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Registration Console</CardTitle>
              <span className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                <span className="h-2 w-2 rounded-full bg-[color:var(--accent-primary)] animate-pulse" />
                Agent Active
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-xs text-[color:var(--text-secondary)]">
              <MessageSquare size={14} />
              Live voice intake
              <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--accent-primary)] border-t-transparent" />
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] p-4 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                Patient Details
              </p>
              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between">
                  <span>Name</span>
                  <span className="text-[color:var(--text-primary)]">
                    {details?.name || "Awaiting"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Age</span>
                  <span className="text-[color:var(--text-primary)]">
                    {details?.age || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Gender</span>
                  <span className="text-[color:var(--text-primary)]">
                    {details?.gender || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Phone</span>
                  <span className="text-[color:var(--text-primary)]">
                    {details?.phone || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Symptoms</span>
                  <span className="text-[color:var(--text-primary)]">
                    {details?.symptoms || "--"}
                  </span>
                </div>
              </div>
            </div>

            {registration && (
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                      Registration Complete
                    </p>
                    <p className="mt-2 text-lg font-semibold">{details?.name || "Patient"}</p>
                  </div>
                  <CheckCircle2 className="text-[color:var(--accent-secondary)]" />
                </div>
                <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-3">
                  <p className="text-xs text-[color:var(--text-secondary)]">Token</p>
                  <p className="font-mono text-xl tracking-[0.2em]">{registration.tokenNumber}</p>
                </div>
                {qrUrl && (
                  <div className="mt-4 flex items-center justify-center">
                    <img src={qrUrl} alt="Token QR" className="h-40 w-40" />
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  {registration?.visitId && (
                    <Link href={`/hospital/opd/token/${registration.visitId}`} target="_blank">
                      <Button size="sm">
                        <Printer size={14} />
                        Print Token
                      </Button>
                    </Link>
                  )}
                  <Button variant="secondary" size="sm">
                    Next Patient
                  </Button>
                </div>
              </div>
            )}

            {!registration && (
              <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                <User size={12} />
                Waiting for OTP verification and confirmation
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
              <Phone size={12} />
              OTP is captured by voice only
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
