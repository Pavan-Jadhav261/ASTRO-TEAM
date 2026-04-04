"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Calendar,
  ClipboardList,
  HeartPulse,
  Home,
  ImagePlus,
  FileUp,
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

  useEffect(() => {
    const patientId = localStorage.getItem("abha_patient_id") || "";
    if (!patientId) {
      setLoadingProfile(false);
      return;
    }
    fetch(`/api/patient/summary?patientId=${patientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPatient(data))
      .catch(() => setPatient(null))
      .finally(() => setLoadingProfile(false));
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
          () => resolve("")
        );
      });

      const response = await fetch("/api/emergency/raise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          reason: summaryData?.summaries?.[0]?.summary || "Emergency requested by patient.",
          location,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send alert.");
      setEmergencyStatus("Emergency alert sent to doctor.");
    } catch (err: any) {
      setEmergencyError(err?.message || "Failed to send alert.");
      setEmergencyStatus(null);
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
                            <Button variant="secondary">Start Recording</Button>
                            <Button variant="secondary">Stop Recording</Button>
                          </CardContent>
                        </Card>
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
              <Button className="w-full" variant="secondary">
                <FileUp size={16} />
                Upload Report
              </Button>
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
                <Button className="w-full" variant="secondary">
                  <ImagePlus size={16} />
                  Analyze Image
                </Button>
                <Button className="w-full" variant="secondary">
                  <Cpu size={16} />
                  Find Best Price
                </Button>
              </div>
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
