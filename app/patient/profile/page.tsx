"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, HelpCircle, LogOut, Mic, Shield, User, Users } from "lucide-react";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

const ease = [0.22, 1, 0.36, 1];

export default function PatientProfilePage() {
  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-6 pb-24">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patient/dashboard" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
            <ArrowLeft size={18} />
          </Link>
          <AbhaLogo />
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm text-[color:var(--text-secondary)]">Manage your account</p>
          <h1 className="text-2xl font-semibold">Profile & Support</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Account Center</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--text-secondary)]">Primary Contact</span>
                  <span className="text-[color:var(--text-primary)]">Verified</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--text-secondary)]">ABHA ID</span>
                  <span className="font-mono text-[color:var(--text-primary)]">ABHA-XXXX-1234</span>
                </div>
              </div>

              <Separator />

              <Accordion type="single" collapsible>
                <AccordionItem value="profile">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      Profile Options
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-sm text-[color:var(--text-secondary)]">
                    <div className="flex items-center justify-between">
                      <span>Linked Helpers</span>
                      <Users size={14} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Privacy Settings</span>
                      <Shield size={14} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Logout</span>
                      <LogOut size={14} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <HelpCircle size={16} />
                      Help & Support
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-sm text-[color:var(--text-secondary)]">
                    <div className="flex items-center justify-between">
                      <span>ABHA Support Desk</span>
                      <span>24x7</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>FAQ</span>
                      <span>Updated weekly</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Feedback</span>
                      <span>Share notes</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" className="w-full">
                  <Mic size={16} />
                  Voice Agent
                </Button>
                <Link href="/patient/summaries">
                  <Button className="w-full">Previous Summaries</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
