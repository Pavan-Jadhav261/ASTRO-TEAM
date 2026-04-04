"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Building2, ShieldCheck, Waves } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { opdPills } from "@/components/neo/mock-data";

const ease = [0.22, 1, 0.36, 1];

export default function HospitalLoginPage() {
  const [hospitalId, setHospitalId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/hospital/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed.");
      router.push("/hospital/opd");
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/" className="text-sm text-[color:var(--text-secondary)]">
            Back to home
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="relative flex flex-col justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)]/70 p-8"
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--elevated)]">
                <Building2 size={20} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-secondary)]">
                  Hospital Console
                </p>
                <h1 className="text-3xl font-semibold">
                  OPD Command Access
                </h1>
              </div>
            </div>
            <p className="max-w-xl text-[color:var(--text-secondary)]">
              Secure access for government hospitals, optimized for high-volume
              intake and AI-first triage.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {opdPills.map((pill) => (
                <div
                  key={pill}
                  className="rounded-full border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-2 text-xs font-medium"
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex items-center gap-3">
            <ShieldCheck size={18} />
            <p className="text-xs text-[color:var(--text-secondary)]">
              Powered by National Health Authority
            </p>
          </div>
          <div className="absolute bottom-6 right-6 flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <Waves size={14} />
            Live throughput wave
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
          className="flex items-center"
        >
          <Card className="neo-card w-full">
            <CardHeader>
              <CardTitle>Enter OPD System</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  Hospital ID
                </label>
                <Input
                  className="font-mono text-lg"
                  placeholder="ABHA-GOV-0184"
                  value={hospitalId}
                  onChange={(event) => setHospitalId(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button size="lg" className="mt-2" onClick={handleLogin} disabled={loading}>
                {loading ? "Signing in..." : "Enter OPD System"}
              </Button>
              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              <p className="text-xs text-[color:var(--text-secondary)]">
                Secure access is monitored and audited.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
