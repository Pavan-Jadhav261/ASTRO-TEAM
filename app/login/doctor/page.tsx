"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { HeartPulse, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ease = [0.22, 1, 0.36, 1];

export default function DoctorLoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(data.error || "Login failed.");
      router.push("/doctor/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/doctor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: doctorName,
          username,
          password,
          department,
        }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(data.error || "Registration failed.");
      router.push("/doctor/dashboard");
    } catch (err: any) {
      setError(err?.message || "Registration failed.");
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
                <Stethoscope size={20} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-secondary)]">
                  Doctor Access
                </p>
                <h1 className="text-3xl font-semibold">Clinical Intelligence</h1>
              </div>
            </div>
            <p className="max-w-xl text-[color:var(--text-secondary)]">
              A secure command center for consultation, summarization, and patient continuity.
            </p>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-3">
              <div className="h-24 w-full rounded-xl bg-gradient-to-r from-[#1f2a44] via-[#1d4ed8] to-[#0f172a] opacity-70" />
              <div className="mt-3 text-xs text-[color:var(--text-secondary)]">
                Live ECG sync - 92 bpm
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-6 flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <HeartPulse size={14} />
            ECG stream active
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
              <CardTitle>Doctor Login</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {mode === "register" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                    Full Name
                  </label>
                  <Input
                    className="text-lg"
                    placeholder="Dr. Riya Sharma"
                    value={doctorName}
                    onChange={(event) => setDoctorName(event.target.value)}
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  Username
                </label>
                <Input
                  className="font-mono text-lg"
                  placeholder="doctor_2849"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              {mode === "register" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                    Department
                  </label>
                  <Input
                    list="dept-options"
                    placeholder="General / Cardiology / Gynecology"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                  />
                  <datalist id="dept-options">
                    <option value="General Medicine" />
                    <option value="Cardiology" />
                    <option value="Gynecology" />
                    <option value="Orthopedics" />
                    <option value="Pediatrics" />
                    <option value="Dermatology" />
                    <option value="Neurology" />
                    <option value="ENT" />
                  </datalist>
                </div>
              )}
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
              {mode === "login" ? (
                <Button size="lg" onClick={handleLogin} disabled={loading}>
                  {loading ? "Signing in..." : "Enter Doctor Portal"}
                </Button>
              ) : (
                <Button size="lg" onClick={handleRegister} disabled={loading}>
                  {loading ? "Registering..." : "Register Doctor"}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login"
                  ? "New doctor? Register"
                  : "Already registered? Login"}
              </Button>
              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
