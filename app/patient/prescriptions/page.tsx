"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pill } from "lucide-react";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PatientPrescriptionsPage() {
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

  const prescriptions = data?.prescriptions || [];

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-8">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <AbhaLogo />
        <ThemeToggle />
      </header>

      <main className="mx-auto mt-8 w-full max-w-4xl">
        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-[color:var(--text-secondary)]">
            {loading && <div>Loading prescriptions...</div>}
            {!loading && prescriptions.length === 0 && (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                No prescriptions available yet.
              </div>
            )}
            {prescriptions.map((rx: any) => (
              <div
                key={rx.id}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-3"
              >
                <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
                  <Pill size={14} className="text-[color:var(--accent-secondary)]" />
                  {rx.medicine}
                </div>
                <p className="text-xs text-[color:var(--text-secondary)]">
                  {rx.dosage || "Dosage NA"} - {rx.duration || "Duration NA"}
                </p>
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
