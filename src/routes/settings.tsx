import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/hsc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hrs, SoftCallout } from "@/components/hsc/ui-bits";
import { useStore } from "@/lib/hsc/store";
import { computeFeasibility, prettyDate, totalRemainingHours } from "@/lib/hsc/planner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — HSC Syllabus Tracker" },
      {
        name: "description",
        content: "Change pacing mode, daily study hours, target date and appearance.",
      },
      { property: "og:title", content: "Settings — HSC Syllabus Tracker" },
      {
        property: "og:description",
        content: "Tune pacing, hours and theme for your HSC study plan.",
      },
    ],
  }),
  component: SettingsPage,
});

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function SettingsPage() {
  const { state, setSettings, reset } = useStore();
  const enabledCount = Math.max(1, state.subjects.filter((s) => s.enabled).length);
  const feas = computeFeasibility(state);

  return (
    <AppShell>
      <h1 className="font-display text-4xl">Settings</h1>

      <section className="mt-8">
        <h2 className="font-display text-xl">Pacing</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["hours", "target"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSettings({ mode: m })}
              className={cn(
                "rounded-xl border p-3 text-sm",
                state.settings.mode === m ? "border-foreground/50" : "border-border text-muted-foreground",
              )}
            >
              {m === "hours" ? "Daily hours" : "Target date"}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="text-sm text-muted-foreground">Hours available per day</span>
          <Input
            type="number"
            min={0.5}
            step={0.5}
            className="mt-2 h-11"
            value={state.settings.hoursPerDay}
            onChange={(e) => setSettings({ hoursPerDay: Number(e.target.value) || 6 })}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm text-muted-foreground">Target date</span>
          <Input
            type="date"
            className="mt-2 h-11"
            value={state.settings.targetDate ?? ""}
            onChange={(e) => setSettings({ targetDate: e.target.value })}
          />
        </label>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Subjects studied per day</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {Array.from({ length: Math.min(4, enabledCount) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setSettings({ subjectsPerDay: n })}
                className={cn(
                  "rounded-xl border p-3 text-sm",
                  state.settings.subjectsPerDay === n
                    ? "border-foreground/50"
                    : "border-border text-muted-foreground",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Subjects rotate day by day so each gets an equal share of the week.
          </p>
        </div>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Weekly revision day (optional)</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <button
              onClick={() => setSettings({ revisionWeekday: null })}
              className={cn(
                "rounded-xl border p-3 text-sm",
                state.settings.revisionWeekday === null
                  ? "border-foreground/50"
                  : "border-border text-muted-foreground",
              )}
            >
              None
            </button>
            {weekdays.map((w, i) => (
              <button
                key={w}
                onClick={() => setSettings({ revisionWeekday: i })}
                className={cn(
                  "rounded-xl border p-3 text-sm",
                  state.settings.revisionWeekday === i
                    ? "border-foreground/50"
                    : "border-border text-muted-foreground",
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border p-4 text-sm">
          <p className="text-muted-foreground">Remaining work</p>
          <p className="mt-1 text-lg">{hrs(totalRemainingHours(state))}</p>
          <p className="mt-3 text-muted-foreground">
            {feas.mode === "target"
              ? `${hrs(feas.requiredDaily)} per day to hit ${prettyDate(feas.finishDate)}`
              : `Projected finish ${prettyDate(feas.finishDate)}`}
          </p>
        </div>

        {!feas.realistic && (
          <div className="mt-4">
            <SoftCallout title="This pace isn't achievable">
              <p>Earliest steady finish is {prettyDate(feas.earliestRealisticDate)}.</p>
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
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Appearance</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["system", "light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSettings({ theme: t })}
              className={cn(
                "rounded-xl border p-3 text-sm capitalize",
                state.settings.theme === t
                  ? "border-foreground/50"
                  : "border-border text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-xl">Data</h2>
        <Button asChild variant="outline" className="w-full h-11">
          <Link to="/onboarding">Re-run setup</Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full h-11 text-destructive"
          onClick={() => {
            if (confirm("Reset all progress and restore the default syllabus?")) reset();
          }}
        >
          Reset everything
        </Button>
      </section>
    </AppShell>
  );
}
