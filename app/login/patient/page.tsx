"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Smartphone } from "lucide-react";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/neo/otp-input";

const ease = [0.22, 1, 0.36, 1];

export default function PatientLoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const normalizePhone = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("+")) return trimmed;
    return `+91${trimmed}`;
  };

  const sendOtp = async () => {
    setStatus("sending");
    setError(null);
    try {
      const fullPhone = normalizePhone(phone);
      const response = await fetch("/api/auth/patient/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send OTP.");
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
    } finally {
      setStatus("idle");
    }
  };

  const verifyOtp = async () => {
    setStatus("verifying");
    setError(null);
    try {
      const fullPhone = normalizePhone(phone);
      const response = await fetch("/api/auth/patient/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code: otp.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid OTP.");
      if (data.patientId) {
        localStorage.setItem("abha_patient_id", data.patientId);
      }
      if (data.needsProfile) {
        router.push("/patient/onboarding");
      } else {
        router.push("/patient/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to verify OTP.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/" className="text-sm text-[color:var(--text-secondary)]">
            Back to home
          </Link>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="mx-auto mt-10 w-full max-w-3xl"
      >
        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Patient Access</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                Mobile Number
              </label>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm">
                  +91
                </span>
                <Input
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </div>
            <Button size="lg" onClick={sendOtp} disabled={status !== "idle"}>
              <Smartphone size={16} />
              {status === "sending" ? "Sending..." : "Send OTP"}
            </Button>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                Enter OTP
              </label>
              <OtpInput onChange={setOtp} />
            </div>
            <Button size="lg" onClick={verifyOtp} disabled={status !== "idle"}>
              Verify & Continue
            </Button>
            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-[color:var(--text-secondary)]">
              <span>Resend in 00:28</span>
              <span className="h-8 w-8 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
