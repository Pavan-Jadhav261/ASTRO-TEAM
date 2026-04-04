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

export default function PatientOnboardingPage() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setError(null);
    setLoading(true);
    try {
      const patientId = localStorage.getItem("abha_patient_id") || "";
      const response = await fetch("/api/patient/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, name, age: Number(age), gender }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save profile.");
      router.push("/patient/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-8">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <AbhaLogo />
        <ThemeToggle />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="mx-auto mt-8 w-full max-w-3xl"
      >
        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                Full Name
              </label>
              <Input
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  Age
                </label>
                <Input
                  placeholder="Age"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  Gender
                </label>
                <Input
                  placeholder="Male / Female / Other"
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                />
              </div>
            </div>
            <Button size="lg" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save & Continue"}
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
  );
}
