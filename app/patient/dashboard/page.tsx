"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  ClipboardList,
  HeartPulse,
  Home,
  ImagePlus,
  FileUp,
  Mic,
  Cpu,
  Pill,
  User,
} from "lucide-react";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/neo/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePathname } from "next/navigation";

const ease = [0.22, 1, 0.36, 1];

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const quickActions = [
  { label: "Book Visit", icon: Calendar, href: "/patient/book-visit" },
  { label: "View Prescriptions", icon: Pill, href: "/patient/prescriptions" },
  { label: "My Records", icon: ClipboardList, href: "/patient/records" },
  { label: "Emergency", icon: HeartPulse, danger: true },
];

export default function PatientDashboardPage() {
  const pathname = usePathname();
  const [emergencyStatus, setEmergencyStatus] = useState<string | null>(null);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [patient, setPatient] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [reportFileName, setReportFileName] = useState("");
  const [medicineImageName, setMedicineImageName] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [medicineStatus, setMedicineStatus] = useState("");
  const [medicineInfo, setMedicineInfo] = useState<{ medicine?: string; strength?: string; form?: string } | null>(null);
  const [recordStatus, setRecordStatus] = useState("");
  const [priceResults, setPriceResults] = useState<any[]>([]);
  const [medicineLabel, setMedicineLabel] = useState("");
  const [emergencyOtherState, setEmergencyOtherState] = useState<"idle" | "recording" | "processing">("idle");
  const [emergencyOtherStatus, setEmergencyOtherStatus] = useState("");
  const emergencyRecorderRef = useRef<MediaRecorder | null>(null);
  const emergencyChunksRef = useRef<Blob[]>([]);
  const [patientId, setPatientId] = useState<string>("");
  const telegramBot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";
  const helperLink = telegramBot && patientId ? `https://t.me/${telegramBot}?start=${patientId}` : "";
  const [helperLinkStatus, setHelperLinkStatus] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      const patientId = localStorage.getItem("abha_patient_id") || "";
      setPatientId(patientId);
      if (!patientId) {
        setLoadingProfile(false);
        return;
      }
      try {
        const res = await fetch(`/api/patient/summary?patientId=${patientId}`);
        const data = res.ok ? await res.json() : null;
        setPatient(data);
      } catch {
        setPatient(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadSummary();
  }, []);

  useEffect(() => {
    const registerPush = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!vapidKey) return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const patientId = localStorage.getItem("abha_patient_id") || "";
      const location = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true }
        );
      });

      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          patientId,
          latitude: location?.lat ?? null,
          longitude: location?.lng ?? null,
        }),
      }).catch(() => null);
    };

    registerPush().catch(() => null);
  }, []);

  const handleEmergencySelf = async () => {
    setEmergencyStatus("Sending alert...");
    setEmergencyError(null);
    try {
      const patientId = localStorage.getItem("abha_patient_id") || "";
      if (!patientId) throw new Error("Patient profile missing.");

      const summaryRes = await fetch(`/api/patient/summary?patientId=${patientId}`);
      const summaryData = summaryRes.ok ? await summaryRes.json() : null;

      const location = await new Promise<string>((resolve) => {
        if (!navigator.geolocation) return resolve("");
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(`${pos.coords.latitude}, ${pos.coords.longitude}`),
          () => resolve(""),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      });

      const response = await fetch("/api/emergency/raise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          reason: summaryData?.summaries?.[0]?.summary || "Emergency requested by patient.",
          location,
          symptoms: summaryData?.visits?.[0]?.symptoms || "",
          summary: summaryData?.summaries?.[0]?.summary || "",
          createdBy: "self",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send alert.");

      if (location) {
        const [lat, lng] = location.split(",").map((val) => Number(val.trim()));
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          await fetch("/api/notifications/dispatch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: lat,
              longitude: lng,
              title: "Emergency nearby",
              message: `${summaryData?.name || "Patient"} needs urgent help.`,
            }),
          }).catch(() => null);
        }
      }
      setEmergencyStatus("Emergency alert sent to doctor.");
    } catch (err: any) {
      setEmergencyError(err?.message || "Failed to send alert.");
      setEmergencyStatus(null);
    }
  };

  const startEmergencyOther = async () => {
    setEmergencyOtherStatus("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      emergencyRecorderRef.current = recorder;
      emergencyChunksRef.current = [];
      setEmergencyOtherState("recording");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          emergencyChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setEmergencyOtherState("processing");
        try {
          const audioBlob = new Blob(emergencyChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "emergency-other.webm");
          const patientId = localStorage.getItem("abha_patient_id") || "";
          formData.append("patientId", patientId);

      const location = await new Promise<string>((resolve) => {
        if (!navigator.geolocation) return resolve("");
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(`${pos.coords.latitude}, ${pos.coords.longitude}`),
          () => resolve(""),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      });
          formData.append("location", location);

          const response = await fetch("/api/emergency/other", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Emergency summary failed.");

          setEmergencyOtherStatus("Emergency alert sent to doctor.");
        } catch (err: any) {
          setEmergencyOtherStatus(err?.message || "Emergency alert failed.");
        } finally {
          setEmergencyOtherState("idle");
        }
      };

      recorder.start();
    } catch (err: any) {
      setEmergencyOtherStatus(err?.message || "Microphone unavailable.");
      setEmergencyOtherState("idle");
    }
  };

  const stopEmergencyOther = () => {
    emergencyRecorderRef.current?.stop();
    emergencyRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  };

  const handleReportUpload = async () => {
    try {
      const patientId = localStorage.getItem("abha_patient_id") || "";
      if (!patientId) throw new Error("Patient profile missing.");
      const input = document.getElementById("report-upload-input") as HTMLInputElement | null;
      const file = input?.files?.[0];
      if (!file) throw new Error("Select a report file first.");
      setReportStatus("Uploading...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", patientId);
      const response = await fetch("/api/patient/report-upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setReportStatus("Report uploaded.");
      fetch(`/api/patient/summary?patientId=${patientId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => setPatient(payload))
        .catch(() => null);
    } catch (err: any) {
      setReportStatus(err?.message || "Upload failed.");
    }
  };

  const handleDeleteRecord = async (type: "summary" | "report", recordId: string) => {
    setRecordStatus("");
    try {
      const patientId = localStorage.getItem("abha_patient_id") || "";
      if (!patientId) throw new Error("Patient profile missing.");
      const action = type === "summary" ? "delete_summary" : "delete_report";
      const res = await fetch("/api/patient/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          patientId,
          ...(type === "summary" ? { summaryId: recordId } : { reportId: recordId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");

      setPatient((prev: any) => {
        if (!prev) return prev;
        if (type === "summary") {
          return {
            ...prev,
            summaries: (prev.summaries || []).filter((item: any) => String(item.id) !== String(recordId)),
          };
        }
        return {
          ...prev,
          reports: (prev.reports || []).filter((item: any) => String(item.id) !== String(recordId)),
        };
      });
      setRecordStatus("Record deleted.");
    } catch (err: any) {
      setRecordStatus(err?.message || "Delete failed.");
    }
  };

  const analyzeMedicineFromImage = async () => {
    try {
      const input = document.getElementById("medicine-image-input") as HTMLInputElement | null;
      const file = input?.files?.[0];
      if (!file) throw new Error("Select a medicine image first.");
      setMedicineStatus("Analyzing image...");
      setPriceResults([]);
      setMedicineLabel("");
      setMedicineInfo(null);

      const formData = new FormData();
      formData.append("image", file);
      const scanRes = await fetch("/api/medicine/scan", {
        method: "POST",
        body: formData,
      });
      const scanData = await scanRes.json();
      if (!scanRes.ok) throw new Error(scanData.error || "Scan failed.");

      const parsed = scanData.data && typeof scanData.data === "object" ? scanData.data : null;
      const detected = String(parsed?.medicine || scanData.text || "").trim();
      if (!detected) throw new Error("Could not detect medicine name.");

      const normalized = {
        medicine: String(parsed?.medicine || detected || "").trim(),
        strength: parsed?.strength ? String(parsed.strength).trim() : "",
        form: parsed?.form ? String(parsed.form).trim() : "",
      };
      setMedicineInfo(normalized);
      setMedicineLabel(normalized.medicine);
      setMedicineStatus("Image analyzed.");
      return normalized;
    } catch (err: any) {
      setMedicineStatus(err?.message || "Analyzer failed.");
      return null;
    }
  };

  const handleMedicineAnalyze = async () => {
    await analyzeMedicineFromImage();
  };

  const handleFindBestPrice = async () => {
    try {
      setMedicineStatus("Analyzing image...");
      const analyzed = await analyzeMedicineFromImage();
      const medicine = analyzed?.medicine || "";
      if (!medicine) throw new Error("Analyze the image first to detect a medicine.");

      setMedicineStatus("Searching prices...");
      setPriceResults([]);
      const priceRes = await fetch("/api/medicine/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: medicine }),
      });
      const priceText = await priceRes.text();
      let priceData: any = null;
      try {
        priceData = priceText ? JSON.parse(priceText) : null;
      } catch {
        priceData = null;
      }
      if (!priceRes.ok) throw new Error(priceData?.error || "Price search failed.");

      const list = Array.isArray(priceData?.items) ? priceData.items : [];
      const sorted = list
        .map((item: any) => ({
          title: String(item?.seller || item?.title || "Medicine").trim(),
          price_inr: Number(item?.price),
          url: String(item?.url || "").trim(),
          source: String(item?.seller || item?.source || "").trim(),
        }))
        .filter((item: any) => item && item.price_inr && item.url)
        .sort((a: any, b: any) => Number(a.price_inr) - Number(b.price_inr));
      setPriceResults(sorted);
      setMedicineStatus(sorted.length ? "Prices updated." : "No prices found.");
    } catch (err: any) {
      setMedicineStatus(err?.message || "Price search failed.");
    }
  };

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-6 pb-24">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/patient/profile">
            <Button variant="ghost" size="sm">
              Profile
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm text-[color:var(--text-secondary)]">
            {loadingProfile
              ? "Loading profile..."
              : patient?.name
                ? `Namaste, ${patient.name}`
                : "Welcome to ABHA+"}
          </p>
          <h1 className="text-2xl font-semibold">Your Health Hub</h1>
          {patientId && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs text-[color:var(--text-secondary)]">
                Patient ID: <span className="font-mono text-[color:var(--text-primary)]">{patientId}</span>
              </div>
              {helperLink && (
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs text-[color:var(--text-secondary)]">
                  Helper link ready
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(helperLink).then(
                        () => setHelperLinkStatus("Helper link copied."),
                        () => setHelperLinkStatus("Copy failed.")
                      );
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              )}
            </div>
          )}
          {helperLinkStatus && (
            <div className="mt-2 text-xs text-[color:var(--text-secondary)]">
              {helperLinkStatus}
            </div>
          )}
          {!helperLink && patientId && (
            <div className="mt-2 text-xs text-[color:var(--text-secondary)]">
              Set `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` to show the helper link.
            </div>
          )}
        </div>

        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Health Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-[color:var(--text-secondary)]">
            <div className="flex items-center justify-between">
              <span>Recent Visit</span>
              <span className="text-[color:var(--text-primary)]">
                {patient?.visits?.[0]?.created_at
                  ? new Date(patient.visits[0].created_at).toLocaleDateString()
                  : "No visits yet"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Next Appointment</span>
              <span className="text-[color:var(--text-primary)]">Not scheduled</span>
            </div>
            <Skeleton className="mt-2 h-3 w-2/3" />
          </CardContent>
        </Card>

        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-[color:var(--text-secondary)]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  Reports
                </p>
                {(patient?.reports || []).length === 0 && (
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs">
                    No reports uploaded yet.
                  </div>
                )}
                {(patient?.reports || []).map((report: any) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs"
                  >
                    <span className="text-[color:var(--text-secondary)]">
                      {report.file_name || "Report"}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDeleteRecord("report", String(report.id))}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  Summaries
                </p>
                {(patient?.summaries || []).length === 0 && (
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs">
                    No summaries yet.
                  </div>
                )}
                {(patient?.summaries || []).map((summary: any) => (
                  <div
                    key={summary.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs"
                  >
                    <span className="text-[color:var(--text-secondary)]">
                      {summary.summary || "Summary"}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDeleteRecord("summary", String(summary.id))}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            {recordStatus && (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
                {recordStatus}
              </div>
            )}
            <Link href="/patient/profile">
              <Button size="sm" variant="secondary">
                Manage Privacy Settings
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease, delay: index * 0.08 }}
              >
                {action.danger ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Card className="neo-card border border-red-500/40">
                        <CardContent className="flex items-center gap-3 py-5">
                          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-red-500/20 text-red-400">
                            <Icon size={18} />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-red-200">
                              Emergency
                            </p>
                            <p className="text-xs text-[color:var(--text-secondary)]">
                              Urgent assistance
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Emergency Help</DialogTitle>
                        <DialogDescription>
                          Choose the type of emergency request.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-3">
                        <Button size="lg" onClick={handleEmergencySelf}>
                          Emergency for Myself
                        </Button>
                        <Card className="neo-card">
                          <CardHeader>
                            <CardTitle className="text-base">Emergency for Others</CardTitle>
                            <p className="text-sm text-[color:var(--text-secondary)]">
                              Speak what the patient is going through.
                            </p>
                          </CardHeader>
                          <CardContent className="flex items-center gap-3">
                            {emergencyOtherState !== "recording" ? (
                              <Button variant="secondary" onClick={startEmergencyOther}>
                                {emergencyOtherState === "processing" ? "Processing..." : "Start Recording"}
                              </Button>
                            ) : (
                              <Button variant="secondary" onClick={stopEmergencyOther}>
                                Stop Recording
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                        {emergencyOtherStatus && (
                          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-secondary)]">
                            {emergencyOtherStatus}
                          </div>
                        )}
                        {emergencyStatus && (
                          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-secondary)]">
                            {emergencyStatus}
                          </div>
                        )}
                        {emergencyError && (
                          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                            {emergencyError}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="secondary">Close</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : action.href ? (
                  <Link href={action.href}>
                    <Card className="neo-card">
                      <CardContent className="flex items-center gap-3 py-5">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--elevated)]">
                          <Icon size={18} />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{action.label}</p>
                          <p className="text-xs text-[color:var(--text-secondary)]">
                            Quick access
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  <Card className="neo-card">
                    <CardContent className="flex items-center gap-3 py-5">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--elevated)]">
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-[color:var(--text-secondary)]">
                          Quick access
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Upload Medical Report</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 text-sm">
                <span className="text-xs text-[color:var(--text-secondary)]">
                  Report File
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-xs font-medium text-[color:var(--text-primary)] transition hover:border-[color:var(--accent-primary)]">
                    <FileUp size={14} />
                    Choose File
                    <Input
                      id="report-upload-input"
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setReportFileName(file?.name || "");
                      }}
                    />
                  </label>
                  <span className="text-xs text-[color:var(--text-secondary)]">
                    {reportFileName || "PDF, JPG, PNG up to 10MB"}
                  </span>
                </div>
              </div>
              <Button className="w-full" variant="secondary" onClick={handleReportUpload}>
                <FileUp size={16} />
                Upload Report
              </Button>
              {reportStatus && (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
                  {reportStatus}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="neo-card md:col-span-1 border border-emerald-500/40 bg-emerald-500/5">
            <CardHeader>
              <CardTitle>Voice Agent</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-emerald-200/80">
                Speak to book visits or ask about recent summaries.
              </p>
              <Link href="/patient/voice-agent">
                <Button className="w-full" variant="secondary">
                  <Mic size={16} />
                  Open Voice Agent
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="neo-card md:col-span-2">
            <CardHeader>
              <CardTitle>Medicine Image Analyzer & Best Price</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 text-sm">
                <span className="text-xs text-[color:var(--text-secondary)]">
                  Medicine Image
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-xs font-medium text-[color:var(--text-primary)] transition hover:border-[color:var(--accent-primary)]">
                    <ImagePlus size={14} />
                    Choose Image
                    <Input
                      id="medicine-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setMedicineImageName(file?.name || "");
                      }}
                    />
                  </label>
                  <span className="text-xs text-[color:var(--text-secondary)]">
                    {medicineImageName || "PNG or JPG, clear label recommended"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                Compare nearby pharmacies for the best price on your prescriptions.
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button className="w-full" variant="secondary" onClick={handleMedicineAnalyze}>
                  <ImagePlus size={16} />
                  Analyze Image
                </Button>
                <Button className="w-full" variant="secondary" onClick={handleFindBestPrice}>
                  <Cpu size={16} />
                  Find Best Price
                </Button>
              </div>
              {medicineInfo?.medicine && (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
                  <div className="font-medium text-[color:var(--text-primary)]">
                    {medicineInfo.medicine}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {medicineInfo.strength && (
                      <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5">
                        {medicineInfo.strength}
                      </span>
                    )}
                    {medicineInfo.form && (
                      <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5">
                        {medicineInfo.form}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {medicineStatus && (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
                  {medicineStatus}
                </div>
              )}
              {priceResults.length > 0 && (
                <div className="grid gap-2">
                  {priceResults.map((item: any, index: number) => (
                    <div
                      key={`${item.url}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="text-[color:var(--text-primary)]">{item.title || "Medicine"}</div>
                        <div className="text-[color:var(--text-secondary)]">{item.source || ""}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[color:var(--text-primary)]">
                          ₹{item.price_inr}
                        </span>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-[color:var(--border)] px-2 py-1 text-[color:var(--accent-secondary)]"
                          >
                            Visit Site
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <nav className="fixed bottom-4 left-1/2 z-40 flex w-[92%] max-w-md -translate-x-1/2 items-center justify-between rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-3">
        {[
          { href: "/patient/dashboard", icon: Home, label: "Home" },
          { href: "/patient/records", icon: ClipboardList, label: "Records" },
          { href: "/patient/prescriptions", icon: Pill, label: "Prescriptions" },
          { href: "/patient/profile", icon: User, label: "Profile" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isActive ? "bg-[color:var(--elevated)] text-[color:var(--text-primary)]" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"}`}
            >
              <Icon size={18} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
