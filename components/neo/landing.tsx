"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  HeartPulse,
  Sparkles,
  Stethoscope,
  ArrowUpRight,
} from "lucide-react";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { Spotlight } from "@/components/neo/spotlight";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { heroStats } from "@/components/neo/mock-data";

const ease = [0.22, 1, 0.36, 1];

const roles = [
  {
    title: "Hospital / OPD Counter",
    desc: "Government Hospital Login",
    icon: Building2,
    accent: "#6366f1",
    href: "/login/hospital",
  },
  {
    title: "Doctor Portal",
    desc: "Patient Consultation",
    icon: Stethoscope,
    accent: "#3b82f6",
    href: "/login/doctor",
  },
  {
    title: "Patient Access",
    desc: "Login with Mobile OTP",
    icon: HeartPulse,
    accent: "#ef4444",
    href: "/login/patient",
  },
];

export function NeoLanding() {
  return (
    <div className="neo-bg min-h-screen abha-mesh">
      <Spotlight />
      <div className="relative z-10">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <AbhaLogo />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Platform
            </Button>
            <Button variant="ghost" size="sm">
              Access
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24">
          <section className="grid items-center gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease }}
              className="flex flex-col gap-6"
            >
              <Badge variant="accent" className="w-fit gap-2">
                <Sparkles size={14} />
                ABHA+ Intelligence Layer
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
                Swasthya Seva,
                <span className="neo-text-gradient"> Powered by AI</span>
              </h1>
              <p className="max-w-xl text-base text-[color:var(--text-secondary)] sm:text-lg">
                ABHA+ unifies OPD kiosks, doctor command centers, and patient
                care companions for India’s public healthcare network.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg">
                  Launch access
                  <ArrowUpRight size={16} />
                </Button>
                <Button variant="secondary" size="lg">
                  View system map
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {heroStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)]/80 px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                      {item.label}
                    </p>
                    <p className="text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.1 }}
              className="grid gap-6"
            >
              <Card className="neo-card">
                <CardHeader>
                  <CardTitle>National Health Authority</CardTitle>
                  <CardDescription>
                    Secure, scalable, and human-first infrastructure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-3 text-sm">
                    Regional orchestration across 28 states
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-3 text-sm">
                    AI triage protocols calibrated for public hospitals
                  </div>
                </CardContent>
              </Card>
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-secondary)]">
                  Mission
                </p>
                <p className="mt-3 text-lg font-semibold">
                  Make every patient touchpoint feel intelligent, trusted, and
                  human.
                </p>
              </div>
            </motion.div>
          </section>

          <section className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              <span className="neo-pill w-fit">Login modes</span>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Choose your ABHA+ portal
              </h2>
              <p className="max-w-2xl text-base text-[color:var(--text-secondary)]">
                Dedicated entry points for hospital operations, clinicians, and
                citizens.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {roles.map((role, index) => {
                const Icon = role.icon;
                return (
                  <motion.div
                    key={role.title}
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, ease, delay: index * 0.08 }}
                  >
                    <Link href={role.href} className="block">
                      <Card
                        className="neo-card border-transparent px-2 py-2"
                        style={{ ["--card-accent" as string]: role.accent }}
                      >
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--elevated)]">
                              <Icon size={20} />
                              <span className="absolute inset-0 rounded-2xl border border-[color:var(--border)]" />
                            </span>
                            <div>
                              <CardTitle>{role.title}</CardTitle>
                              <CardDescription>{role.desc}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="neo-divider mb-4" />
                          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                            Secure entry
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
