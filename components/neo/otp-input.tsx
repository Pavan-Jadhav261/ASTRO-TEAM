"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function OtpInput({ length = 6 }: { length?: number }) {
  const reduceMotion = useReducedMotion();
  const [values, setValues] = useState<string[]>(
    Array.from({ length }, () => "")
  );
  const [completed, setCompleted] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setCompleted(values.every((v) => v !== ""));
  }, [values]);

  const handleChange = (index: number, value: string) => {
    const next = value.replace(/\D/g, "").slice(-1);
    const updated = [...values];
    updated[index] = next;
    setValues(updated);
    if (next && inputs.current[index + 1]) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === "Backspace" && !values[index] && inputs.current[index - 1]) {
      inputs.current[index - 1]?.focus();
    }
  };

  const ripple = useMemo(
    () => ({
      animate: completed && !reduceMotion ? { scale: [1, 1.08, 1] } : undefined,
      transition: { duration: 0.6, ease: "easeOut" },
    }),
    [completed, reduceMotion]
  );

  return (
    <motion.div
      className="flex items-center gap-2"
      animate={ripple.animate}
      transition={ripple.transition}
    >
      {values.map((value, index) => (
        <motion.input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          value={value}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className={cn(
            "h-12 w-12 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] text-center text-lg font-semibold text-[color:var(--text-primary)] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[color:var(--accent-primary)]",
            completed && "border-[color:var(--accent-primary)]"
          )}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </motion.div>
  );
}
