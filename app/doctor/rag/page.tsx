"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ease = [0.22, 1, 0.36, 1] as const;

export default function DoctorRagPage() {
  const [ragInput, setRagInput] = useState("");
  const [ragMessages, setRagMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [ragLoading, setRagLoading] = useState(false);

  const handleRagAsk = async () => {
    if (!ragInput.trim() || ragLoading) return;
    const question = ragInput.trim();
    setRagInput("");
    setRagMessages((prev) => [...prev, { role: "user", content: question }]);
    setRagLoading(true);
    try {
      const res = await fetch("/api/doctor/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "RAG response failed.");
      setRagMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text || "No response returned." },
      ]);
    } catch (err: any) {
      setRagMessages((prev) => [
        ...prev,
        { role: "assistant", content: err?.message || "RAG failed." },
      ]);
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-6 pb-24">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/doctor/dashboard" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
            <ArrowLeft size={18} />
          </Link>
          <AbhaLogo />
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto mt-8 flex w-full max-w-5xl flex-col gap-6">
        <div>
          <p className="text-sm text-[color:var(--text-secondary)]">RAG clinical assistant</p>
          <h1 className="text-2xl font-semibold">ABHA+ Knowledge Assistant</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
        >
          <p className="text-sm text-[color:var(--text-secondary)]">
            Grounded answers from the MSF Clinical Guidelines document (RAGDATA.txt).
          </p>

          <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--elevated)] p-4 text-sm text-[color:var(--text-secondary)]">
            {ragMessages.length === 0 && (
              <div>Ask about protocols, diagnostic steps, drug guidance, or red flags.</div>
            )}
            {ragMessages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={`rounded-xl px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-[color:var(--surface)] text-[color:var(--text-primary)]"
                    : "border border-[color:var(--border)]"
                }`}
              >
                <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">
                  {msg.role === "user" ? "You" : "Agent"}
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--text-primary)]">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              value={ragInput}
              onChange={(event) => setRagInput(event.target.value)}
              placeholder="Ask the RAG agent..."
            />
            <Button onClick={handleRagAsk} disabled={ragLoading}>
              <Send size={16} />
              {ragLoading ? "Thinking..." : "Send"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
