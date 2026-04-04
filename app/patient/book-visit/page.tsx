"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ease = [0.22, 1, 0.36, 1];

export default function BookVisitPage() {
  const [symptoms, setSymptoms] = useState("");
  const [department, setDepartment] = useState("General Medicine");
  const [tokenData, setTokenData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const patientId = localStorage.getItem("abha_patient_id") || "";
      const response = await fetch("/api/patient/book-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, symptoms, department }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to book visit.");
      setTokenData(data);
    } catch (err: any) {
      setError(err?.message || "Failed to book visit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-8">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <AbhaLogo />
        <ThemeToggle />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="mx-auto mt-8 w-full max-w-4xl"
      >
        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Book a Visit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
              Symptoms
            </label>
            <Input
              placeholder="Describe your symptoms"
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
            />
            <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
              Department
            </label>
            <Input
              placeholder="General Medicine"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
            <Button size="lg" onClick={handleSubmit} disabled={loading}>
              {loading ? "Booking..." : "Generate Token"}
            </Button>
            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {tokenData && (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm">
                <div className="text-xs text-[color:var(--text-secondary)]">Token</div>
                <div className="text-xl font-semibold">{tokenData.tokenNumber}</div>
                <div className="mt-2 text-xs text-[color:var(--text-secondary)]">
                  Room: {tokenData.roomNumber}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => router.push(`/patient/token/${tokenData.visitId}`)}>
                    View Token Slip
                  </Button>
                  <Button variant="secondary" onClick={() => router.push("/patient/dashboard")}>
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
