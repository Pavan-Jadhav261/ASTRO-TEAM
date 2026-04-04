import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-4 w-full animate-[shimmer_2.2s_infinite] rounded-full bg-[linear-gradient(110deg,rgba(255,255,255,0.08),rgba(255,255,255,0.18),rgba(255,255,255,0.08))] bg-[length:200%_100%]",
        className
      )}
    />
  );
}
