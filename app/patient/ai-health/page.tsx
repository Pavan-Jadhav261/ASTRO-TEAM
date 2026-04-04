"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { companions } from "@/components/neo/mock-data";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ease = [0.22, 1, 0.36, 1];

export default function AiHealthPage() {
  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm">
            Back to dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto mt-8 w-full max-w-6xl">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-secondary)]">
            AI Health
          </p>
          <h1 className="text-3xl font-semibold">Your AI Health Companions</h1>
          <p className="text-[color:var(--text-secondary)]">
            Choose your personal health guide.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companions.map((companion, index) => (
            <motion.div
              key={companion.id}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease, delay: index * 0.06 }}
            >
              <Link href={`/patient/ai-health/${companion.id}`}>
                <Card className="neo-card relative overflow-hidden">
                  {index < 2 && (
                    <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                      <Sparkles size={10} />
                      Most Used
                    </div>
                  )}
                  <CardHeader>
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${companion.gradient} text-2xl`}
                    >
                      {companion.emoji}
                    </div>
                    <CardTitle className="mt-4">{companion.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-xs text-[color:var(--text-secondary)]">
                      {companion.desc}
                    </p>
                    <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs">
                      Chat Now
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
