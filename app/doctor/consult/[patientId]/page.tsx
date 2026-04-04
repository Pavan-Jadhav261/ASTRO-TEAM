"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar as RadarShape,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ArrowLeft,
  Brain,
  Clock,
  FileText,
  Mic,
  Pause,
  Pill,
  Play,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/neo/skeleton";

const ease = [0.22, 1, 0.36, 1];

type VisitData = {
  visitId: string;
  tokenNumber: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  symptoms: string;
  department: string;
  roomNumber?: string | null;
  patientId?: string | null;
};

type RecordingState = "idle" | "recording" | "paused" | "summarizing" | "done";

export default function DoctorConsultPage() {
  const reduceMotion = useReducedMotion();
  const params = useParams();
  const raw = params?.patientId;
  const visitId = Array.isArray(raw) ? raw[0] : raw;

  const [visit, setVisit] = useState<VisitData | null>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [toolResults, setToolResults] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiPrescriptions, setAiPrescriptions] = useState<any[]>([]);
  const [radarScores, setRadarScores] = useState<any>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!visitId) return;
    setIsLoading(true);
    fetch(`/api/opd/visit/${visitId}`)
      .then((res) => res.json())
      .then((data) => setVisit(data))
      .finally(() => setIsLoading(false));
  }, [visitId]);

  useEffect(() => {
    if (!visit?.patientId) return;
    fetch(`/api/doctor/patient/${visit.patientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPatientProfile(data))
      .catch(() => setPatientProfile(null));
  }, [visit?.patientId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (recordingState === "recording") {
      interval = setInterval(() => setTimer((value) => value + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recordingState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    setRecordError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setRecordingState("summarizing");
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", blob, "consultation.webm");
          formData.append("notes", visit?.symptoms || "");

          const response = await fetch("/api/gemini/consult", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error || "Gemini request failed.");
          }
          setTranscript(data.transcript || "");
          setToolResults(data.functionCalls || []);
          setAiSummary(data.analysis?.summary || null);
          setAiPrescriptions(data.analysis?.prescriptions || []);
          setRadarScores(data.analysis?.radar || null);
          setRecordingState("done");
        } catch (err: any) {
          setRecordError(err?.message || "Failed to process audio.");
          setRecordingState("done");
        }
      };

      recorder.start();
      setTimer(0);
      setRecordingState("recording");
    } catch (err: any) {
      setRecordError(err?.message || "Microphone access denied.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  };

  const prescriptions = patientProfile?.prescriptions || [];
  const visits = patientProfile?.visits || [];
  const reports = patientProfile?.reports || [];
  const displayPrescriptions = aiPrescriptions.length > 0 ? aiPrescriptions : prescriptions;
  const radarData = [
    { metric: "Cardio", score: radarScores?.cardio ?? 60 },
    { metric: "Mental", score: radarScores?.mental ?? 55 },
    { metric: "Physical", score: radarScores?.physical ?? 62 },
    { metric: "Nutrition", score: radarScores?.nutrition ?? 58 },
    { metric: "Risk", score: radarScores?.risk ?? 50 },
  ];

  return (
    <main className="relative min-h-screen abha-mesh neo-bg px-4 py-4 md:px-6 md:py-6 text-[15px] md:text-[16px]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/doctor/dashboard" className="text-[color:var(--text-secondary)]">
            <ArrowLeft size={18} />
          </Link>
          <AbhaLogo />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <Stethoscope size={14} />
            Session {formatTime(timer)}
          </div>
          <Button size="sm" aria-label="Open AI assistant">
            <Brain size={14} />
            AI Agent (RAG)
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Dashboard grid matching wireframe ──
           Layout:
           [Patient Snapshot]  [AI Live Consultancy ]  [Health Radar ]
           [History         ]  [     (spans 2 rows) ]  [Digital Twin  ]
      */}
      <section
        className="mx-auto mt-6 w-full max-w-7xl"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.8fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "16px",
          height: "calc(100vh - 120px)",
        }}
        aria-label="Consultation layout"
      >
        {/* ── ROW 1, COL 1: Patient Snapshot ── */}
        <Card
          className="neo-card"
          style={{ gridColumn: 1, gridRow: 1, overflow: "hidden" }}
          aria-labelledby="patient-snapshot-title"
        >
          <CardHeader>
            <CardTitle id="patient-snapshot-title">Patient Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm overflow-y-auto" style={{ maxHeight: "calc(100% - 60px)" }}>
            {isLoading ? (
              <Skeleton className="h-6 w-2/3" />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--elevated)] text-sm font-semibold">
                    {visit?.name ? visit.name.slice(0, 2).toUpperCase() : "NA"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {visit?.name || "No data available"}
                    </p>
                    <p className="text-xs text-[color:var(--text-secondary)]">
                      {visit?.age ? `${visit.age}y` : "--"} - {visit?.gender || "--"}
                    </p>
                    <p className="text-xs text-[color:var(--text-secondary)]">{visit?.phone || "--"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visit?.department ? (
                    <Badge variant="accent">{visit.department}</Badge>
                  ) : (
                    <Badge>Department NA</Badge>
                  )}
                  {visit?.tokenNumber ? <Badge>Token {visit.tokenNumber}</Badge> : <Badge>Token NA</Badge>}
                </div>
                {aiSummary && (
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--text-secondary)] mb-1">
                      AI Summary
                    </p>
                    <p className="text-xs text-[color:var(--text-primary)]">
                      {aiSummary.chiefComplaint || "Chief complaint pending."}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                      Diagnosis: {aiSummary.diagnosis || "Pending"}
                    </p>
                  </div>
                )}
                {visit?.symptoms && (
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--text-secondary)] mb-1">Symptoms</p>
                    <p className="text-xs text-[color:var(--text-primary)]">{visit.symptoms}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── ROW 1–2, COL 2: AI Live Consultancy — spans both rows ── */}
        <Card
          className="neo-card"
          style={{ gridColumn: 2, gridRow: "1 / 3", overflow: "hidden" }}
          aria-labelledby="consult-title"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle id="consult-title">AI Live Consultancy</CardTitle>
              <span className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                <Clock size={12} />
                {formatTime(timer)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "calc(100% - 60px)" }}>
            {/* Waveform visualizer */}
            <div className="flex h-20 items-end gap-1" aria-hidden={reduceMotion ?? undefined}>
              {Array.from({ length: 32 }).map((_, index) => (
                <motion.span
                  key={index}
                  className="w-[3px] rounded-full bg-gradient-to-t from-[color:var(--accent-primary)] to-[color:var(--accent-secondary)]"
                  animate={reduceMotion ? { height: 12 } : { height: [8, 36, 14] }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.03 }
                  }
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {recordingState !== "recording" ? (
                <Button size="lg" onClick={startRecording} disabled={recordingState === "summarizing"}>
                  <Mic size={16} />
                  {recordingState === "summarizing" ? "Processing..." : "Record"}
                </Button>
              ) : (
                <Button size="lg" variant="secondary" onClick={stopRecording}>
                  <Play size={16} />
                  Stop
                </Button>
              )}
              <Button variant="secondary" size="lg" disabled>
                <Pause size={16} />
                Pause
              </Button>
            </div>

            {/* Live Transcript */}
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm leading-6">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                Live Transcript
              </p>
              <p className="text-[color:var(--text-secondary)]">
                {transcript || "Start recording to generate a transcript."}
              </p>
              {recordError && (
                <p className="mt-3 text-xs text-red-400">{recordError}</p>
              )}
            </div>

            {/* AI Summary Cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: "chiefComplaint", label: "Chief Complaint", color: "#E63946" },
                { key: "findings", label: "Findings", color: "#E6A817" },
                { key: "diagnosis", label: "Diagnosis", color: "#12B88A" },
                { key: "plan", label: "Plan", color: "#1A6EBF" },
              ].map((section) => (
                <div
                  key={section.key}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] p-4 text-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="h-10 w-1 rounded-full"
                      style={{ background: section.color }}
                    />
                    <div>
                      <p
                        className="text-xs font-semibold uppercase tracking-[0.2em]"
                        style={{ color: section.color }}
                      >
                        {section.label}
                      </p>
                      <p className="mt-2 text-[color:var(--text-secondary)]">
                        {aiSummary?.[section.key] || "Not available yet."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Prescriptions */}
            <div className="mt-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                <Pill size={16} className="text-[color:var(--accent-secondary)]" />
                Prescriptions
              </p>
              <div className="flex flex-col gap-2 text-sm text-[color:var(--text-secondary)]">
                {displayPrescriptions.length === 0 ? (
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-3 py-2">
                    No prescriptions yet.
                  </div>
                ) : (
                  displayPrescriptions.map((rx: any) => (
                    <div
                      key={rx.id || rx.medicine || Math.random()}
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <Pill size={14} className="text-[color:var(--accent-secondary)]" />
                        <span className="font-medium">{rx.medicine || rx.medicineName || "Medicine"}</span>
                      </div>
                      <p className="text-xs text-[color:var(--text-secondary)]">
                        {rx.dosage || "Dosage NA"} - {rx.duration || "Duration NA"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── ROW 1, COL 3: Health Radar ── */}
        <Card
          className="neo-card"
          style={{ gridColumn: 3, gridRow: 1, overflow: "hidden" }}
          aria-labelledby="health-radar-title"
        >
          <CardHeader>
            <CardTitle id="health-radar-title">Health Radar</CardTitle>
          </CardHeader>
          <CardContent className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="rgba(148,163,184,0.25)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <RadarShape dataKey="score" stroke="#6366f1" fill="rgba(99,102,241,0.35)" strokeWidth={2} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── ROW 2, COL 1: History ── */}
        <Card
          className="neo-card"
          style={{ gridColumn: 1, gridRow: 2, overflow: "hidden" }}
          aria-labelledby="history-title"
        >
          <CardHeader>
            <CardTitle id="history-title">History</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-xs text-[color:var(--text-secondary)] overflow-y-auto" style={{ maxHeight: "calc(100% - 60px)" }}>
            {visits.length === 0 ? (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                No history yet.
              </div>
            ) : (
              visits.map((entry: any) => (
                <div
                  key={entry.visit_id}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2"
                >
                  {new Date(entry.created_at).toLocaleDateString()} - {entry.department}
                </div>
              ))
            )}
            {patientProfile?.summaries?.length > 0 && (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--text-secondary)] mb-1">
                  Previous Summaries
                </p>
                <div className="flex flex-col gap-2">
                  {patientProfile.summaries.map((summary: any) => (
                    <div key={summary.id} className="text-xs text-[color:var(--text-secondary)]">
                      {summary.summary || "Summary not available"}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button size="sm" variant="secondary">
              <FileText size={14} />
              View full history
            </Button>
          </CardContent>
        </Card>

        {/* ── ROW 2, COL 3: Digital Twin ── */}
        <Card
          className="neo-card"
          style={{ gridColumn: 3, gridRow: 2, overflow: "hidden" }}
          aria-labelledby="digital-twin-title"
        >
          <CardHeader>
            <CardTitle id="digital-twin-title">Digital Twin</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[color:var(--text-secondary)]">
            Preview the patient model and overlays.
            <div className="mt-3">
              <Link href="/patient/digital-twin" className="text-[color:var(--accent-secondary)]">
                Open Digital Twin
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
