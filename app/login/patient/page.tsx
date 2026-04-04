"use client";

import { motion } from "framer-motion";
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
                <Input placeholder="98765 43210" />
              </div>
            </div>
            <Button size="lg">
              <Smartphone size={16} />
              Send OTP
            </Button>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                Enter OTP
              </label>
              <OtpInput />
            </div>
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
