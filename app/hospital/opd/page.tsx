"use client";

import {
  MessageSquare,
  CheckCircle2,
  Globe,
  Printer,
  User,
} from "lucide-react";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { VoiceAgent } from "@/components/neo/voice-agent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ease = [0.22, 1, 0.36, 1];

export default function OpdKioskPage() {
  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[color:var(--accent-primary)] shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
            Live OPD Kiosk
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto mt-8 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="flex flex-col gap-6">
          <VoiceAgent />
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Language</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {["हिंदी", "English", "தமிழ்", "తెలుగు"].map((lang) => (
                <span
                  key={lang}
                  className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-xs"
                >
                  <Globe size={12} className="mr-2 inline-block" />
                  {lang}
                </span>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="neo-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Live Conversation</CardTitle>
              <span className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                <span className="h-2 w-2 rounded-full bg-[color:var(--accent-primary)] animate-pulse" />
                Active
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="self-end rounded-2xl border-l-4 border-[color:var(--accent-critical)] bg-[color:var(--surface)] px-4 py-3 text-sm">
                <span className="mb-1 block text-xs text-[color:var(--text-secondary)]">
                  Patient • 08:31
                </span>
                I have chest discomfort and dizziness.
              </div>
              <div className="self-start rounded-2xl bg-gradient-to-br from-[#1f2a44] to-[#111827] px-4 py-3 text-sm text-white">
                <span className="mb-1 block text-xs text-white/60">
                  ABHA+ AI • 08:31
                </span>
                Understood. Please confirm your ABHA ID or mobile number.
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-xs text-[color:var(--text-secondary)]">
              <MessageSquare size={14} />
              Registering patient...
              <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--accent-primary)] border-t-transparent" />
            </div>
            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--elevated)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                    Registration Complete
                  </p>
                  <p className="mt-2 text-lg font-semibold">Ayesha Khan</p>
                </div>
                <CheckCircle2 className="text-[color:var(--accent-secondary)]" />
              </div>
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <p className="text-xs text-[color:var(--text-secondary)]">
                  ABHA ID
                </p>
                <p className="font-mono text-xl tracking-[0.2em]">ABH-8T9-12X</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button size="sm">
                  <Printer size={14} />
                  Print Token
                </Button>
                <Button variant="secondary" size="sm">
                  Next Patient
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
              <User size={12} />
              Accessible mode enabled • Large text
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
