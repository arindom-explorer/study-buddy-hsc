import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/hsc/types";

export const accentVar = (accent: string) => `var(--${accent})`;

export function ProgressBar({
  value,
  accent,
  className,
}: {
  value: number;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`,
          backgroundColor: accent ? accentVar(accent) : "var(--foreground)",
        }}
      />
    </div>
  );
}

export function SubjectTag({ accent, label }: { accent: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      <span
        className="inline-block size-1.5 rounded-full"
        style={{ backgroundColor: accentVar(accent) }}
      />
      {label}
    </span>
  );
}

export const difficultyLabel: Record<Difficulty, string> = {
  hard: "Hard",
  average: "Average",
  short: "Short",
  none: "Untagged",
};

export function DifficultyChip({ d }: { d: Difficulty }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
        d === "hard" && "border-destructive/30 text-destructive",
        d === "average" && "border-border text-muted-foreground",
        d === "short" && "border-border text-muted-foreground",
        d === "none" && "border-dashed border-border text-muted-foreground",
      )}
    >
      {difficultyLabel[d]}
    </span>
  );
}

export function SoftCallout({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-warn/40 bg-warn-surface/60 p-4 text-warn-foreground">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-1 text-sm/relaxed opacity-90">{children}</div>
    </div>
  );
}

export const hrs = (n: number) => `${Math.round(n * 10) / 10}h`;
