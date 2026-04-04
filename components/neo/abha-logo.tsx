import { Plus } from "lucide-react";

export function AbhaLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] text-white shadow-[0_10px_30px_-16px_rgba(99,102,241,0.7)]">
          <Plus size={16} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold tracking-wide text-[color:var(--text-primary)]">
          ABHA+
        </span>
        <span className="text-xs text-[color:var(--text-secondary)]">
          AI Health Infrastructure
        </span>
      </div>
    </div>
  );
}
