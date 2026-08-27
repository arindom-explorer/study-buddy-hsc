import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/hsc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DifficultyChip, HoursInput, ProgressBar, SoftCallout, hrs } from "@/components/hsc/ui-bits";
import { useStore } from "@/lib/hsc/store";
import { computeFeasibility, prettyDate, totalRemainingHours } from "@/lib/hsc/planner";
import type { Difficulty } from "@/lib/hsc/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your plan — HSC Syllabus Tracker" },
      {
        name: "description",
        content: "Pick subjects, tune chapter difficulty and choose how you want to pace HSC prep.",
      },
      { property: "og:title", content: "Set up your plan — HSC Syllabus Tracker" },
      {
        property: "og:description",
        content: "Guided setup: subjects, difficulty defaults, pacing and a feasibility check.",
      },
    ],
  }),
  component: Onboarding,
});

const diffs: Difficulty[] = ["hard", "average", "short", "none"];

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


function Onboarding() {
  const { state, update, setSettings, setDifficulty } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const feas = useMemo(() => computeFeasibility(state), [state]);

  const steps = ["Subjects", "Difficulty", "Pacing", "Rhythm", "Check"];
  const enabledCount = Math.max(1, state.subjects.filter((s) => s.enabled).length);

  return (
    <AppShell>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Step {step + 1} of 5 · {steps[step]}
      </p>
      <ProgressBar className="mt-3" value={(step + 1) / 5} />

      {step === 0 && (
        <div className="animate-rise mt-8">
          <h1 className="font-display text-4xl">Which subjects?</h1>
          <div className="mt-6 space-y-2">
            {state.subjects.map((s) => (
              <button
                key={s.id}
                onClick={() =>
                  update((d) => {
                    const t = d.subjects.find((x) => x.id === s.id);
                    if (t) t.enabled = !t.enabled;
                  })
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors",
                  s.enabled ? "border-foreground/40 bg-card" : "border-border opacity-60",
                )}
                style={{ borderLeft: `3px solid var(--${s.accent})` }}
              >
                <span>
                  <span className="block font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.chapters.length} chapters · {s.strategy.length}-step strategy
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{s.enabled ? "On" : "Off"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-rise mt-8">
          <h1 className="font-display text-4xl">Tune difficulty</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Defaults follow typical HSC difficulty. Hard 50h · Average 40h · Short 30h · Untagged 6h.
          </p>
          <div className="mt-6 space-y-6">
            {state.subjects
              .filter((s) => s.enabled)
              .map((s) => (
                <div key={s.id}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {s.name}
                  </p>
                  <div className="mt-2 space-y-2">
                    {s.chapters.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                        <div className="flex gap-1">
                          {diffs.map((d) => (
                            <button
                              key={d}
                              onClick={() => setDifficulty(s.id, c.id, d)}
                              className={cn(
                                "rounded-md px-2 py-1 text-[11px] transition-colors",
                                c.difficulty === d
                                  ? "bg-foreground text-background"
                                  : "text-muted-foreground hover:bg-accent",
                              )}
                            >
                              {d === "none" ? "—" : d[0]!.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-rise mt-8">
          <h1 className="font-display text-4xl">How should we pace it?</h1>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => setSettings({ mode: "hours" })}
              className={cn(
                "w-full rounded-xl border p-4 text-left",
                state.settings.mode === "hours" ? "border-foreground/40" : "border-border",
              )}
            >
              <p className="font-medium">I know my daily hours</p>
              <p className="text-xs text-muted-foreground">We calculate a realistic finish date.</p>
            </button>
            <button
              onClick={() => setSettings({ mode: "target" })}
              className={cn(
                "w-full rounded-xl border p-4 text-left",
                state.settings.mode === "target" ? "border-foreground/40" : "border-border",
              )}
            >
              <p className="font-medium">I have a target date</p>
              <p className="text-xs text-muted-foreground">
                We calculate the daily hours needed to hit it.
              </p>
            </button>
          </div>

          {state.settings.mode === "hours" ? (
            <label className="mt-6 block">
              <span className="text-sm text-muted-foreground">Study hours available per day</span>
              <HoursInput
                value={state.settings.hoursPerDay}
                onChange={(v) => setSettings({ hoursPerDay: v })}
              />
            </label>
          ) : (
            <label className="mt-6 block">
              <span className="text-sm text-muted-foreground">Target finish date</span>
              <Input
                type="date"
                className="mt-2 h-11"
                value={state.settings.targetDate ?? ""}
                onChange={(e) => setSettings({ targetDate: e.target.value })}
              />
            </label>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="animate-rise mt-8">
          <h1 className="font-display text-4xl">Weekly rhythm</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            How many subjects do you want to touch each day? Subjects rotate so every one gets an
            equal share of the week.
          </p>
          <div className="mt-6 grid grid-cols-4 gap-2">
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

          <p className="mt-8 text-sm text-muted-foreground">
            Optional: keep one day a week free for revision. The plan reflows around it.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
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
      )}

      {step === 4 && (
        <div className="animate-rise mt-8">
          <h1 className="font-display text-4xl">Feasibility check</h1>
          <div className="mt-6 space-y-4 text-sm">
            <Row label="Total work remaining" value={hrs(totalRemainingHours(state))} />
            {feas.mode === "target" ? (
              <>
                <Row label="Target date" value={prettyDate(feas.finishDate)} />
                <Row label="Daily hours needed" value={hrs(feas.requiredDaily)} />
              </>
            ) : (
              <>
                <Row label="Daily hours" value={hrs(feas.requiredDaily)} />
                <Row label="Projected finish" value={prettyDate(feas.finishDate)} />
              </>
            )}
          </div>

          {!feas.realistic && (
            <div className="mt-6">
              <SoftCallout title="That pace isn't achievable">
                <p>
                  It would need around {hrs(feas.requiredDaily)} every single day. A steady plan
                  finishes on {prettyDate(feas.earliestRealisticDate)}.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setSettings({ targetDate: feas.earliestRealisticDate })}
                >
                  Switch to the realistic date
                </Button>
              </SoftCallout>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 flex gap-2">
        {step > 0 && (
          <Button variant="ghost" className="flex-1 h-11" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button
          className="flex-1 h-11"
          onClick={() => {
            if (step < 4) setStep(step + 1);
            else {
              setSettings({ onboarded: true });
              navigate({ to: "/" });
            }
          }}
        >
          {step < 4 ? "Continue" : "Start studying"}
        </Button>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-lg">{value}</span>
    </div>
  );
}
