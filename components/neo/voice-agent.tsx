"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Mic, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VoiceState = "idle" | "listening" | "speaking";

export function VoiceAgent() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [level, setLevel] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 12 }, () => 12));
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const statusLabel = useMemo(() => {
    if (!active) return "Idle";
    return state === "speaking" ? "Speaking" : "Listening";
  }, [active, state]);

  useEffect(() => {
    if (!active) return;
    let isMounted = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) return;
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          const avg =
            data.reduce((sum, value) => sum + value, 0) / data.length / 255;
          const nextLevel = Math.min(1, avg * 2);
          setLevel(nextLevel);
          setState(nextLevel > 0.2 ? "speaking" : "listening");

          if (!reduceMotion) {
            setBars((prev) =>
              prev.map((_, index) =>
                8 + Math.round((data[index % data.length] / 255) * 28)
              )
            );
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (error) {
        setActive(false);
        setState("idle");
      }
    };

    start();
    return () => {
      isMounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      analyserRef.current?.disconnect();
      audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [active, reduceMotion]);

  return (
    <Card className="neo-card">
      <CardHeader className="flex flex-col gap-2">
        <CardTitle>Liveit Voice Agent</CardTitle>
        <p className="text-sm text-[color:var(--text-secondary)]">
          Real-time voice intelligence with adaptive, responsive visuals.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <div className="relative">
          <motion.div
            className="neo-orb"
            animate={
              reduceMotion
                ? undefined
                : {
                    scale: [1, 1 + level * 0.08, 1],
                    opacity: [0.9, 1, 0.9],
                  }
            }
            transition={{ duration: 3, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
          />
          {!reduceMotion && (
            <>
              <span className="absolute inset-0 rounded-full border border-[color:var(--accent-primary)]/60 animate-[pulseRing_4s_ease-in-out_infinite]" />
              <span className="absolute inset-0 rounded-full border border-[color:var(--accent-secondary)]/50 animate-[pulseRing_4s_ease-in-out_infinite] [animation-delay:0.6s]" />
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="accent" className="gap-2 px-4 py-2 text-xs">
            <Sparkles size={12} />
            {statusLabel}
          </Badge>
          <Button size="sm" onClick={() => setActive((prev) => !prev)}>
            <Mic size={14} />
            {active ? "Stop" : "Start"} Voice
          </Button>
        </div>

        <div className="flex items-end gap-2">
          {bars.map((height, index) => (
            <motion.span
              key={index}
              className="w-[3px] rounded-full bg-gradient-to-t from-[color:var(--accent-primary)] to-[color:var(--accent-secondary)]"
              animate={reduceMotion ? undefined : { height }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ height: reduceMotion ? 18 : height }}
            />
          ))}
        </div>

        <p className="text-center text-sm text-[color:var(--text-secondary)]">
          {active
            ? "Say your name and reason for visit."
            : "Tap start to enable the voice assistant."}
        </p>
      </CardContent>
    </Card>
  );
}
