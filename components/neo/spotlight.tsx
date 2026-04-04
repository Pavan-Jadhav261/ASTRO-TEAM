"use client";

import { useEffect } from "react";

export function Spotlight() {
  useEffect(() => {
    const root = document.documentElement;
    const finePointer = window.matchMedia("(pointer: fine)");
    if (!finePointer.matches) {
      root.style.setProperty("--spotlight-x", "50%");
      root.style.setProperty("--spotlight-y", "40%");
      return;
    }

    const handleMove = (event: MouseEvent) => {
      root.style.setProperty("--spotlight-x", `${event.clientX}px`);
      root.style.setProperty("--spotlight-y", `${event.clientY}px`);
    };

    const handleLeave = () => {
      root.style.setProperty("--spotlight-x", "50%");
      root.style.setProperty("--spotlight-y", "40%");
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return <div className="neo-spotlight" aria-hidden="true" />;
}
