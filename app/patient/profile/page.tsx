"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, HelpCircle, LogOut, Mic, Shield, User, Users } from "lucide-react";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

const ease = [0.22, 1, 0.36, 1];

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const patientId = localStorage.getItem("abha_patient_id") || "";
    fetch(`/api/patient/profile?patientId=${patientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));

    fetch(`/api/patient/summary?patientId=${patientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSummaryData(data))
      .catch(() => setSummaryData(null));
  }, []);

  const handlePrivacy = async (action: string, payload: Record<string, any> = {}) => {
    setStatus("");
    const patientId = localStorage.getItem("abha_patient_id") || "";
    const res = await fetch("/api/patient/privacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, patientId, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Action failed.");
      return;
    }
    setStatus("Action completed.");

    if (action === "delete_summary" || action === "delete_report") {
      fetch(`/api/patient/summary?patientId=${patientId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setSummaryData(data))
        .catch(() => null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login/patient";
  };

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-6 pb-24">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patient/dashboard" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
            <ArrowLeft size={18} />
          </Link>
          <AbhaLogo />
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm text-[color:var(--text-secondary)]">Manage your account</p>
          <h1 className="text-2xl font-semibold">Profile & Support</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Account Center</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--text-secondary)]">Primary Contact</span>
                  <span className="text-[color:var(--text-primary)]">
                    {loading ? "Loading..." : profile?.phone || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--text-secondary)]">ABHA ID</span>
                  <span className="font-mono text-[color:var(--text-primary)]">
                    {profile?.id || "ABHA-XXXX"}
                  </span>
                </div>
              </div>

              <Separator />

              <Accordion type="single" collapsible>
                <AccordionItem value="profile">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      Profile Options
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-sm text-[color:var(--text-secondary)]">
                    <div className="flex items-center justify-between">
                      <span>Linked Helpers</span>
                      <Users size={14} />
                    </div>
                    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs">
                      {(profile?.guardians || []).length === 0
                        ? "No linked helpers yet."
                        : (profile.guardians || []).join(", ")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Privacy Settings</span>
                      <Shield size={14} />
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)] mb-2">
                          Summaries
                        </p>
                        <div className="flex flex-col gap-2">
                          {(summaryData?.summaries || []).length === 0 && (
                            <div className="text-xs text-[color:var(--text-secondary)]">No summaries.</div>
                          )}
                          {(summaryData?.summaries || []).map((summary: any) => (
                            <div key={summary.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-[color:var(--text-secondary)]">
                                {summary.summary || "Summary"}
                              </span>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handlePrivacy("delete_summary", { summaryId: summary.id })}
                              >
                                Delete
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)] mb-2">
                          Reports
                        </p>
                        <div className="flex flex-col gap-2">
                          {(summaryData?.reports || []).length === 0 && (
                            <div className="text-xs text-[color:var(--text-secondary)]">No reports.</div>
                          )}
                          {(summaryData?.reports || []).map((report: any) => (
                            <div key={report.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-[color:var(--text-secondary)]">
                                {report.file_name || "Report"}
                              </span>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handlePrivacy("delete_report", { reportId: report.id })}
                              >
                                Delete
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button size="sm" variant="secondary" onClick={() => handlePrivacy("delete_profile")}>
                        Delete Profile
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Logout</span>
                      <LogOut size={14} />
                    </div>
                    <Button size="sm" variant="secondary" onClick={handleLogout}>
                      Logout
                    </Button>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <HelpCircle size={16} />
                      Help & Support
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-sm text-[color:var(--text-secondary)]">
                    <div className="flex items-center justify-between">
                      <span>ABHA Support Desk</span>
                      <span>24x7</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>FAQ</span>
                      <span>Updated weekly</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Feedback</span>
                      <span>Share notes</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" className="w-full">
                  <Mic size={16} />
                  Voice Agent
                </Button>
                <Link href="/patient/summaries">
                  <Button className="w-full">Previous Summaries</Button>
                </Link>
              </div>
              {status && (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
                  {status}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
