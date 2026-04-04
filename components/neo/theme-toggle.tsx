"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type ThemeMode = "dark" | "light";

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("neo-theme") as ThemeMode | null;
    const nextMode = saved ?? "dark";
    setMode(nextMode);
    document.documentElement.classList.toggle("light", nextMode === "light");
  }, []);

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    document.documentElement.classList.toggle("light", next === "light");
    window.localStorage.setItem("neo-theme", next);
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-full"
    >
      {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      <span className="text-xs">{mode === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
