"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function CountUp({
  to,
  duration = 1200,
  suffix = "",
}: {
  to: number;
  duration?: number;
  suffix?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? to : 0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(to);
      return;
    }

    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.floor(progress * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration, reduceMotion]);

  return (
    <span>
      {value}
      {suffix}
    </span>
  );
}
