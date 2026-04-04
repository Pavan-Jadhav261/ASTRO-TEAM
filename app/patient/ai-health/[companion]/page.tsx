"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, Send } from "lucide-react";
import Link from "next/link";

import { companions } from "@/components/neo/mock-data";
import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ease = [0.22, 1, 0.36, 1];

export default function CompanionChatPage() {
  const params = useParams();
  const raw = params?.companion;
  const companionId = Array.isArray(raw) ? raw[0] : raw;
  const companion =
    companions.find((item) => item.id === companionId) ?? companions[0];

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-6 pb-24">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/patient/ai-health" className="text-sm text-[color:var(--text-secondary)]">
            <ArrowLeft size={14} className="mr-2 inline-block" />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${companion.gradient} text-2xl`}
          >
            {companion.emoji}
          </div>
          <div>
            <p className="text-sm text-[color:var(--text-secondary)]">Online</p>
            <h1 className="text-2xl font-semibold">{companion.name}</h1>
          </div>
        </div>

        <motion.div
          className={`rounded-3xl bg-gradient-to-br ${companion.gradient} p-6 text-white`}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease }}
        >
          <p className="text-sm uppercase tracking-[0.2em]">Companion Brief</p>
          <p className="mt-2 text-lg">
            {companion.desc}. I will guide you through tailored routines and
            check-ins.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          <div className="self-start rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            Hello! How can I support your health today?
          </div>
          <div className="self-end rounded-2xl bg-[color:var(--accent-secondary)] px-4 py-3 text-sm text-white">
            I want a quick plan for this week.
          </div>
          <div
            className={`self-start rounded-2xl bg-gradient-to-br ${companion.gradient} px-4 py-3 text-sm text-white`}
          >
            Great. I will draft a 7‑day routine and daily reminders.
          </div>
        </div>
      </main>

      <div className="fixed bottom-6 left-1/2 z-40 w-[92%] max-w-4xl -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
          <Input className="h-10 border-none bg-transparent px-2" placeholder="Type your message..." />
          <Button size="sm">
            <Send size={14} />
          </Button>
          <Button variant="secondary" size="sm">
            <Mic size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
