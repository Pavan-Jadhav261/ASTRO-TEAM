"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, MapPin, QrCode, X, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const ease = [0.22, 1, 0.36, 1];

export default function DoctorDashboardPage() {
  const [open, setOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [emergency, setEmergency] = useState<any>(null);
  const [emergencyPatient, setEmergencyPatient] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRafRef = useRef<number | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const handleScan = () => {
    try {
      const parsed = JSON.parse(scanValue);
      if (parsed.visitId) {
        router.push(`/doctor/consult/${parsed.visitId}`);
        return;
      }
    } catch {
      // ignore
    }
    if (scanValue.trim()) {
      router.push(`/doctor/consult/${scanValue.trim()}`);
    }
  };

  const stopScanner = () => {
    if (scanRafRef.current) {
      cancelAnimationFrame(scanRafRef.current);
      scanRafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startScanner = async () => {
    setScannerError(null);
    const supportsBarcode = "BarcodeDetector" in window;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!supportsBarcode) {
        setScannerError("Auto-detect not supported. Align QR and hold steady.");
      }
      const detector = supportsBarcode
        ? new (window as any).BarcodeDetector({ formats: ["qr_code"] })
        : null;
      const scan = async () => {
        if (!videoRef.current) return;
        try {
          if (detector) {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue || "";
              stopScanner();
              setOpen(false);
              try {
                const parsed = JSON.parse(rawValue);
                if (parsed.visitId) {
                  router.push(`/doctor/consult/${parsed.visitId}`);
                  return;
                }
              } catch {
                // ignore
              }
              if (rawValue) {
                router.push(`/doctor/consult/${rawValue}`);
              }
              return;
            }
          } else {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (canvas && video.videoWidth && video.videoHeight) {
              const ctx = canvas.getContext("2d");
              if (ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, canvas.width, canvas.height);
                if (code?.data) {
                  stopScanner();
                  setOpen(false);
                  try {
                    const parsed = JSON.parse(code.data);
                    if (parsed.visitId) {
                      router.push(`/doctor/consult/${parsed.visitId}`);
                      return;
                    }
                  } catch {
                    // ignore
                  }
                  router.push(`/doctor/consult/${code.data}`);
                  return;
                }
              }
            }
          }
        } catch {
          // ignore detection errors
        }
        scanRafRef.current = requestAnimationFrame(scan);
      };
      scanRafRef.current = requestAnimationFrame(scan);
    } catch (err: any) {
      setScannerError(err?.message || "Unable to access camera.");
      stopScanner();
    }
  };

  const useLatest = async () => {
    const response = await fetch("/api/opd/latest");
    if (!response.ok) return;
    const data = await response.json();
    if (data.visitId) router.push(`/doctor/consult/${data.visitId}`);
  };

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let channel: any;

    const fetchPatient = async (patientId: string) => {
      const res = await fetch(`/api/doctor/patient/${patientId}`);
      if (!res.ok) return;
      const data = await res.json();
      setEmergencyPatient(data);
    };

    if (supabase) {
      channel = supabase
        .channel("emergency-alerts")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "emergency_alerts" },
          (payload) => {
            setEmergency(payload.new);
            if (payload.new?.patient_id) {
              fetchPatient(payload.new.patient_id);
            }
          }
        )
        .subscribe();
    } else {
      pollTimer = setInterval(async () => {
        const res = await fetch("/api/emergency/latest");
        if (!res.ok) return;
        const data = await res.json();
        setEmergency(data);
        if (data?.patient_id) {
          fetchPatient(data.patient_id);
        }
      }, 6000);
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (channel) supabase?.removeChannel(channel);
    };
  }, []);


  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setDashboardError(null);
        const res = await fetch("/api/doctor/dashboard");
        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }
        if (!res.ok) throw new Error(data.error || "Failed to load dashboard.");
        setDashboardData(data);
      } catch (err: any) {
        setDashboardError(err?.message || "Failed to load dashboard.");
      }
    };
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <Avatar>
              <AvatarFallback>
                {dashboardData?.doctor?.name
                  ? dashboardData.doctor.name
                      .split(" ")
                      .map((part: string) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "DR"}
              </AvatarFallback>
            </Avatar>
            {dashboardData?.doctor?.name
              ? `${dashboardData.doctor.name} - ${dashboardData.doctor.department || "Department"}`
              : "Doctor Portal"}
          </div>
          <ThemeToggle />
          <Link href="/login/doctor" className="text-xs text-[color:var(--text-secondary)]">
            Logout
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Doctor Command Center</h1>
            <p className="mt-2 text-[color:var(--text-secondary)]">
              AI agent (RAG-trained) is ready to assist with patient insights.
            </p>
          </div>
          <Link href="/doctor/rag">
            <Button size="lg">
              <Sparkles size={16} />
              AI Agent (RAG)
            </Button>
          </Link>
        </div>

        <div className="flex justify-center">
          <motion.button
            onClick={() => {
              setOpen(true);
              setTimeout(startScanner, 50);
            }}
            className="relative grid h-40 w-40 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={{ ease }}
            aria-label="Open QR scanner"
          >
            <span className="absolute inset-3 rounded-full border border-dashed border-[color:var(--accent-secondary)] animate-spin [animation-duration:6s]" />
            <QrCode size={42} />
            <span className="absolute -bottom-10 text-xs uppercase tracking-[0.3em] text-[color:var(--text-secondary)]">
              Scan
            </span>
          </motion.button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Patients in Queue",
              value:
                dashboardData?.stats?.queueCount != null
                  ? String(dashboardData.stats.queueCount)
                  : "--",
            },
            {
              label: "Avg time per patient",
              value:
                dashboardData?.stats?.avgMinutes != null
                  ? `${dashboardData.stats.avgMinutes} min`
                  : "--",
            },
            {
              label: "Consulted Today",
              value:
                dashboardData?.stats?.consultedToday != null
                  ? String(dashboardData.stats.consultedToday)
                  : "--",
            },
          ].map((stat) => (
            <Card key={stat.label} className="neo-card">
              <CardHeader>
                <CardTitle className="text-base">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stat.value}</div>
                <Badge variant="accent" className="mt-3 w-fit">
                  Live update
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="queue">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--text-secondary)]">
              {dashboardError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  {dashboardError}
                </div>
              )}
              {!dashboardError && (dashboardData?.queue || []).length === 0 && (
                <div>No active queue yet.</div>
              )}
              <div className="space-y-2">
                {(dashboardData?.queue || []).map((visit: any) => (
                  <div
                    key={visit.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-3 py-2 text-xs text-[color:var(--text-secondary)]"
                  >
                    <div className="font-mono text-[color:var(--text-primary)]">
                      {visit.token || visit.id}
                    </div>
                    <div>
                      {visit.name} {visit.age ? `(${visit.age}y)` : ""} {visit.gender || ""}
                    </div>
                    <div>{visit.department || "OPD"}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="completed">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--text-secondary)]">
              {!dashboardError && (dashboardData?.completed || []).length === 0 && (
                <div>No completed consultations yet.</div>
              )}
              <div className="space-y-2">
                {(dashboardData?.completed || []).map((summary: any) => (
                  <div
                    key={summary.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-3 py-2 text-xs text-[color:var(--text-secondary)]"
                  >
                    <div className="font-mono text-[color:var(--text-primary)]">
                      {summary.token || summary.visitId}
                    </div>
                    <div>
                      {summary.name} {summary.age ? `(${summary.age}y)` : ""} {summary.gender || ""}
                    </div>
                    <div>{summary.diagnosis || "Summary saved"}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Scan Patient Token</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              placeholder="Paste QR payload or visit ID"
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleScan}>Open Visit</Button>
              <Button variant="secondary" onClick={useLatest}>
                Use Latest Token
              </Button>
            </div>
          </CardContent>
        </Card>

      </main>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-lg rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.4, ease }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">QR Scanner</h2>
                <button
                  onClick={() => {
                    stopScanner();
                    setOpen(false);
                  }}
                  className="rounded-full border border-[color:var(--border)] p-2"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="relative mt-6 aspect-square rounded-2xl border border-[color:var(--border)] bg-black">
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full rounded-2xl object-cover"
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-6 rounded-2xl border border-dashed border-[color:var(--accent-secondary)]/70" />
                <div className="absolute left-6 top-6 h-6 w-6 border-l-2 border-t-2 border-[color:var(--accent-secondary)]" />
                <div className="absolute right-6 top-6 h-6 w-6 border-r-2 border-t-2 border-[color:var(--accent-secondary)]" />
                <div className="absolute bottom-6 left-6 h-6 w-6 border-b-2 border-l-2 border-[color:var(--accent-secondary)]" />
                <div className="absolute bottom-6 right-6 h-6 w-6 border-b-2 border-r-2 border-[color:var(--accent-secondary)]" />
                <div className="absolute inset-0 grid place-items-center text-xs text-white/70">
                  <Camera size={18} />
                  Align QR within frame
                </div>
              </div>
              {scannerError && (
                <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  {scannerError}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={startScanner}>
                  Retry Camera
                </Button>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Use Manual Entry
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {emergency && (
          <motion.div
            className="fixed bottom-6 right-6 z-50 w-[92%] max-w-sm"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            drag
            dragMomentum={false}
          >
            <div className="rounded-3xl border border-red-500/40 bg-[color:var(--surface)] p-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-red-300">Emergency Alert</div>
                <button
                  onClick={() => {
                    setEmergency(null);
                    setEmergencyPatient(null);
                  }}
                  className="rounded-full border border-[color:var(--border)] p-1"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3 text-sm text-[color:var(--text-secondary)]">
                {emergency.reason || "Urgent assistance requested."}
              </div>
              {emergencyPatient && (
                <div className="mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] p-3 text-xs">
                  <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {emergencyPatient.name || "Patient"} ({emergencyPatient.age || "--"} - {emergencyPatient.gender || "--"})
                  </div>
                  <div className="mt-1 text-[color:var(--text-secondary)]">
                    Phone: {emergencyPatient.phone || "Unknown"}
                  </div>
                  <div className="mt-2 text-[color:var(--text-secondary)]">
                    Previous summaries:
                    <div className="mt-1 space-y-1">
                      {(emergencyPatient.summaries || []).length === 0 && (
                        <div>No summaries available.</div>
                      )}
                      {(emergencyPatient.summaries || []).map((summary: any) => (
                        <div key={summary.id}>{summary.summary || "Summary not available"}</div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 text-[color:var(--text-secondary)]">
                    Reports:
                    <div className="mt-1 space-y-1">
                      {(emergencyPatient.reports || []).length === 0 && (
                        <div>No reports available.</div>
                      )}
                      {(emergencyPatient.reports || []).map((report: any) => (
                        <div key={report.id}>{report.file_name || "Report"}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {emergency.location && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                  <MapPin size={12} />
                  {emergency.location}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm">Open Patient</Button>
                <Button size="sm" variant="secondary">
                  Acknowledge
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
