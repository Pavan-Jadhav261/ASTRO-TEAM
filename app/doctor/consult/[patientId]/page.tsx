"use client";

import { motion } from "framer-motion";
import {
  Clock,
  FileText,
  Mic,
  Pause,
  Play,
  Stethoscope,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar as RadarShape,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/neo/count-up";
import { Skeleton } from "@/components/neo/skeleton";
import { timelineVisits } from "@/components/neo/mock-data";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ease = [0.22, 1, 0.36, 1];

const radarData = [
  { metric: "Cardio", score: 78 },
  { metric: "Mental", score: 62 },
  { metric: "Physical", score: 74 },
  { metric: "Nutrition", score: 68 },
  { metric: "Risk", score: 54 },
];

export default function DoctorConsultPage() {
  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-6">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <Stethoscope size={14} />
            Session 12:41
          </div>
          <Button size="sm">
            AI Agent (RAG)
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Clinician
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>AI Assistant</DropdownMenuLabel>
              <DropdownMenuItem>Summarize chart</DropdownMenuItem>
              <DropdownMenuItem>Draft prescription</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto mt-8 grid w-full max-w-6xl gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <section className="flex flex-col gap-6">
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Live Consultation</CardTitle>
              <p className="text-sm text-[color:var(--text-secondary)]">
                AI agent (RAG‑trained) is available for real-time assistance.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 text-base">
              <div className="flex h-24 items-end gap-1">
                {Array.from({ length: 40 }).map((_, index) => (
                  <motion.span
                    key={index}
                    className="w-[3px] rounded-full bg-gradient-to-t from-[color:var(--accent-primary)] to-[color:var(--accent-secondary)]"
                    animate={{ height: [8, 42, 16] }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease,
                      delay: index * 0.04,
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg">
                  <Mic size={16} />
                  Record
                </Button>
                <Button variant="secondary" size="lg">
                  <Pause size={16} />
                  Pause
                </Button>
                <Button variant="secondary" size="lg">
                  <Play size={16} />
                  Stop
                </Button>
                <span className="ml-auto flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
                  <Clock size={14} />
                  00:18:42
                </span>
              </div>
              <div
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-sm leading-7"
                aria-live="polite"
              >
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  Live Transcript
                </p>
                <p className="text-[color:var(--text-secondary)]">
                  Patient reports shortness of breath and intermittent chest pain
                  since morning. No history of smoking.
                </p>
              </div>
              <Card className="neo-card">
                <CardHeader>
                  <CardTitle>AI Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {[
                    { title: "Chief Complaint", detail: "Chest discomfort, dizziness." },
                    { title: "Findings", detail: "Vitals stable, ECG pending." },
                    { title: "Diagnosis", detail: "Possible angina." },
                    { title: "Plan", detail: "Order ECG, CBC, observe." },
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, ease, delay: index * 0.1 }}
                      className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                        {item.title}
                      </p>
                      <p className="text-sm font-medium">{item.detail}</p>
                    </motion.div>
                  ))}
                  <div className="flex flex-wrap gap-3">
                    <Button size="lg">Confirm & Save</Button>
                    <Button variant="secondary" size="lg">
                      Edit Summary
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </section>

        <aside className="flex flex-col gap-6">
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Patient Snapshot</CardTitle>
              <p className="text-sm text-[color:var(--text-secondary)]">
                Key identifiers and health indicators.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-base">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[color:var(--elevated)] text-sm font-semibold">
                  AK
                </div>
                <div>
                  <p className="text-sm font-semibold">Ayesha Khan</p>
                  <p className="text-xs text-[color:var(--text-secondary)]">
                    32  Female  ABH-8T9-12X
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="critical">Diabetic</Badge>
                <Badge variant="accent">Hypertensive</Badge>
                <Badge>Stable</Badge>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  Health Score
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-semibold">
                    <CountUp to={74} />
                  </span>
                  <span className="text-sm text-[color:var(--text-secondary)]">
                    /100
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {["Heart", "Mental", "Physical", "Nutrition"].map((item, index) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="text-xs text-[color:var(--text-secondary)]">
                        {item}
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-[color:var(--surface)]">
                        <motion.div
                          className="h-2 rounded-full bg-[color:var(--accent-primary)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${70 - index * 6}%` }}
                          transition={{ duration: 0.8, ease, delay: index * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                <h3 className="text-sm font-semibold">Previous Visits</h3>
                <div className="mt-3 flex flex-col gap-4">
                  {timelineVisits.map((visit) => (
                    <div key={visit.date} className="border-l border-[color:var(--border)] pl-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                        {visit.date}
                      </p>
                      <p className="text-sm font-medium">{visit.type}</p>
                      <p className="text-xs text-[color:var(--text-secondary)]">
                        {visit.doctor}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Health Radar</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="rgba(148,163,184,0.25)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  />
                  <RadarShape
                    dataKey="score"
                    stroke="#6366f1"
                    fill="rgba(99,102,241,0.35)"
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="neo-card">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-[color:var(--text-secondary)]">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                09 Jan · Diabetes consult · Stable
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                23 Nov · OPD fever · Resolved
              </div>
              <Button variant="secondary" size="sm">
                <FileText size={14} />
                View full history
              </Button>
              <div className="mt-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}

