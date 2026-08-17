import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/hsc/AppShell";
import { SoftCallout, hrs } from "@/components/hsc/ui-bits";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/hsc/store";
import { computeFeasibility, prettyDate, scheduleDays, todayKey } from "@/lib/hsc/planner";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Timeline — HSC Syllabus Tracker" },
      {
        name: "description",
        content: "See which HSC chapters land on which days and when your syllabus finishes.",
      },
      { property: "og:title", content: "Timeline — HSC Syllabus Tracker" },
      {
        property: "og:description",
        content: "A day-by-day map of your remaining HSC syllabus.",
      },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const { state, setSettings } = useStore();
  const feas = useMemo(() => computeFeasibility(state), [state]);
  const days = useMemo(() => scheduleDays(state, 45), [state]);

  return (
    <AppShell>
      <h1 className="font-display text-4xl">Timeline</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {hrs(feas.remainingHours)} remaining ·{" "}
        {feas.mode === "target"
          ? `${hrs(feas.requiredDaily)} needed per day`
          : `finishing ${prettyDate(feas.finishDate)}`}
      </p>

      {!feas.realistic && (
        <div className="mt-5">
          <SoftCallout title="The current pace doesn't fit in a day">
            <p>Earliest steady finish: {prettyDate(feas.earliestRealisticDate)}.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setSettings({ targetDate: feas.earliestRealisticDate })}
            >
              Use the realistic date
            </Button>
          </SoftCallout>
        </div>
      )}

      <ol className="mt-8 space-y-5 border-l border-border pl-5">
        {days.map((d) => (
          <li key={d.date} className="relative">
            <span className="absolute -left-[1.42rem] top-1.5 size-2 rounded-full bg-border" />
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">
                {d.date === todayKey() ? "Today" : prettyDate(d.date)}
              </p>
              <p className="text-xs text-muted-foreground">{hrs(d.hours)}</p>
            </div>
            <ul className="mt-1.5 space-y-1">
              {d.tasks.map((t) => (
                <li key={t.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--${t.accent})` }}
                  />
                  <span className="truncate">
                    {t.chapterName} — {t.stepLabel}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
        {days.length === 0 && (
          <li className="text-sm text-muted-foreground">Nothing scheduled — syllabus complete.</li>
        )}
      </ol>
    </AppShell>
  );
}
