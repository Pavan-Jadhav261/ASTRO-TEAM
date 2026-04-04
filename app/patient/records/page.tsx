"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QrCode } from "lucide-react";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PatientRecordsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const patientId = localStorage.getItem("abha_patient_id") || "";
    if (!patientId) {
      setLoading(false);
      return;
    }
    fetch(`/api/patient/summary?patientId=${patientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => setData(payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const visits = data?.visits || [];

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-8">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <AbhaLogo />
        <ThemeToggle />
      </header>

      <main className="mx-auto mt-8 w-full max-w-4xl">
        <Card className="neo-card">
          <CardHeader>
            <CardTitle>My Tokens</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-[color:var(--text-secondary)]">
            {loading && <div>Loading tokens...</div>}
            {!loading && visits.length === 0 && (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                No tokens found.
              </div>
            )}
            {visits.map((visit: any) => (
              <div
                key={visit.visit_id}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-3"
              >
                <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
                  <QrCode size={14} className="text-[color:var(--accent-secondary)]" />
                  Token {visit.token_number}
                </div>
                <p className="text-xs text-[color:var(--text-secondary)]">
                  {visit.department} - {new Date(visit.created_at).toLocaleDateString()}
                </p>
                <Link href={`/patient/token/${visit.visit_id}`} className="text-xs text-[color:var(--accent-secondary)]">
                  View Token Slip
                </Link>
              </div>
            ))}
            <Link href="/patient/dashboard">
              <Button variant="secondary" size="sm">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
