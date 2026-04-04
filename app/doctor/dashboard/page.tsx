"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, QrCode, X, Sparkles } from "lucide-react";
import Link from "next/link";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ease = [0.22, 1, 0.36, 1];

export default function DoctorDashboardPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <Avatar>
              <AvatarFallback>AS</AvatarFallback>
            </Avatar>
            Dr. Arjun Sen · Cardiology
          </div>
          <ThemeToggle />
          <Link href="/login/doctor" className="text-xs text-[color:var(--text-secondary)]">
            Logout
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Doctor Command Center</h1>
            <p className="mt-2 text-[color:var(--text-secondary)]">
              AI agent (RAG‑trained) is ready to assist with patient insights.
            </p>
          </div>
          <Button size="lg">
            <Sparkles size={16} />
            AI Agent (RAG)
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Patients in Queue", value: "18" },
            { label: "Avg time per patient", value: "9.4 min" },
            { label: "Consulted Today", value: "27" },
          ].map((stat) => (
            <Card key={stat.label} className="neo-card">
              <CardHeader>
                <CardTitle className="text-base">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stat.value}</div>
                <Badge variant="accent" className="mt-3 w-fit">
                  Live update
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="queue">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--text-secondary)]">
              Active queue overview with priority flags.
            </div>
          </TabsContent>
          <TabsContent value="completed">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--text-secondary)]">
              Recently completed consultations.
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-center">
          <h2 className="text-2xl font-semibold">Scan Patient Token</h2>
          <p className="mt-2 text-[color:var(--text-secondary)]">
            Launch the scanner to begin a consultation.
          </p>
        </div>
        <motion.button
          onClick={() => setOpen(true)}
          className="relative grid h-40 w-40 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ ease }}
        >
          <span className="absolute inset-3 rounded-full border border-dashed border-[color:var(--accent-secondary)] animate-spin [animation-duration:6s]" />
          <QrCode size={42} />
          <span className="absolute -bottom-10 text-xs uppercase tracking-[0.3em] text-[color:var(--text-secondary)]">
            Scan
          </span>
        </motion.button>
      </main>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-lg rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.4, ease }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">QR Scanner</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[color:var(--border)] p-2"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="relative mt-6 aspect-square rounded-2xl border border-[color:var(--border)] bg-[#0f172a]">
                <div className="absolute inset-6 rounded-2xl border border-dashed border-[color:var(--accent-secondary)]/70" />
                <div className="absolute inset-0">
                  <div className="abha-scanline" />
                </div>
                <div className="absolute left-6 top-6 h-6 w-6 border-l-2 border-t-2 border-[color:var(--accent-secondary)]" />
                <div className="absolute right-6 top-6 h-6 w-6 border-r-2 border-t-2 border-[color:var(--accent-secondary)]" />
                <div className="absolute bottom-6 left-6 h-6 w-6 border-b-2 border-l-2 border-[color:var(--accent-secondary)]" />
                <div className="absolute bottom-6 right-6 h-6 w-6 border-b-2 border-r-2 border-[color:var(--accent-secondary)]" />
                <div className="absolute inset-0 grid place-items-center text-xs text-white/60">
                  <Camera size={18} />
                  Align QR within frame
                </div>
              </div>
              <Button className="mt-6 w-full">Simulate Scan</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
