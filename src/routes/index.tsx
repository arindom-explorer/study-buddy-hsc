import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Flame, Sparkles, SkipForward } from "lucide-react";
import { AppShell } from "@/components/hsc/AppShell";
import { ProgressBar, SoftCallout, SubjectTag, hrs } from "@/components/hsc/ui-bits";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/hsc/store";
import {
  activeSubjects,
  computeFeasibility,
  isChapterDone,
  prettyDate,
  streakCount,
  subjectProgress,
  todayKey,
  todaysTasks,
  weekSummary,
} from "@/lib/hsc/planner";
import { TimeLogSheet } from "@/components/hsc/TimeLogSheet";
import { MissedDayDialog } from "@/components/hsc/MissedDayDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — HSC Syllabus Tracker" },
      {
        name: "description",
        content:
          "Your daily HSC study plan for Physics, Chemistry, Higher Math and Biology with time-aware pacing.",
      },
      { property: "og:title", content: "Today — HSC Syllabus Tracker" },
      {
        property: "og:description",
        content: "A time-aware study planner for the Bangladesh HSC syllabus.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { state, hydrated, toggleStep, setSettings } = useStore();
  const [justDone, setJustDone] = useState<string | null>(null);
  const [pendingLog, setPendingLog] = useState<{ subjectId: string; chapterId: string } | null>(
    null,
  );

  const feas = useMemo(() => computeFeasibility(state), [state]);
  const today = useMemo(() => todaysTasks(state), [state]);
  const week = useMemo(() => weekSummary(state), [state]);
  const streak = streakCount(state.logs);

  if (!hydrated) return <AppShell>{null}</AppShell>;

  if (!state.settings.onboarded) {
    return (
      <AppShell>
        <div className="animate-rise py-16 text-center">
          <h1 className="font-display text-5xl leading-tight">HSC Syllabus Tracker</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm/relaxed text-muted-foreground">
            A calm, time-aware plan for Physics, Chemistry, Higher Math and Biology — built on the
            NCTB chapter list.
          </p>
          <Button asChild className="mt-8 h-11 px-6">
            <Link to="/onboarding">Start setup</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const grouped = today.tasks.reduce<Record<string, typeof today.tasks>>((acc, t) => {
    (acc[t.subjectId] ??= []).push(t);
    return acc;
  }, {});

  const overload = today.hours > state.settings.hoursPerDay + 0.5;
  const allDone = today.tasks.length === 0;

  const onComplete = (t: (typeof today.tasks)[number]) => {
    setJustDone(t.key);
    setTimeout(() => setJustDone(null), 400);
    toggleStep(t.subjectId, t.chapterId, t.stepId);
    const subject = state.subjects.find((s) => s.id === t.subjectId);
    const chapter = subject?.chapters.find((c) => c.id === t.chapterId);
    if (subject && chapter && chapter.done.length + 1 >= subject.strategy.length) {
      setPendingLog({ subjectId: t.subjectId, chapterId: t.chapterId });
    }
  };

  return (
    <AppShell>
      <header className="animate-rise">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {prettyDate(todayKey())}
        </p>
        <h1 className="mt-1 font-display text-4xl">Today</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Flame className="size-4" /> {streak} day streak
          </span>
          <span>{hrs(today.hours)} planned</span>
          <span>
            {feas.mode === "target"
              ? `${hrs(feas.requiredDaily)}/day needed`
              : `finish ${prettyDate(feas.finishDate)}`}
          </span>
        </div>
      </header>

      {!feas.realistic && feas.mode === "target" && (
        <div className="mt-5">
          <SoftCallout title="This target date needs more hours than a day holds">
            <p>
              Finishing by {prettyDate(feas.finishDate)} would take about{" "}
              {hrs(feas.requiredDaily)} of study every day. A steady, realistic finish is{" "}
              {prettyDate(feas.earliestRealisticDate)}.
            </p>
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

      {overload && (
        <p className="mt-5 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Today&apos;s load is {hrs(today.hours)} but you usually have{" "}
          {hrs(state.settings.hoursPerDay)}. Consider moving a task to tomorrow.
        </p>
      )}

      <section className="mt-8 space-y-8">
        {allDone ? (
          <div className="animate-rise rounded-2xl border border-border p-8 text-center">
            <Sparkles className="mx-auto size-6 text-muted-foreground" />
            <h2 className="mt-3 font-display text-2xl">Day complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing left on the plan. Rest well — momentum is a study skill.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([subjectId, tasks]) => {
            const subject = state.subjects.find((s) => s.id === subjectId)!;
            return (
              <div key={subjectId} className="animate-rise">
                <SubjectTag accent={subject.accent} label={subject.name} />
                <ul className="mt-3 space-y-2">
                  {tasks.map((t) => (
                    <li
                      key={t.key}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5"
                      style={{ borderLeft: `3px solid var(--${t.accent})` }}
                    >
                      <button
                        aria-label={`Complete ${t.stepLabel}`}
                        onClick={() => onComplete(t)}
                        className={cn(
                          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border transition-colors hover:bg-accent active:scale-95",
                          justDone === t.key && "animate-pop bg-foreground text-background",
                        )}
                      >
                        <Check className="size-3.5 opacity-70" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.chapterName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.stepLabel} · {hrs(t.hours)}
                        </p>
                      </div>
                      <button
                        aria-label="Skip to tomorrow"
                        className="mt-0.5 text-muted-foreground transition-opacity hover:opacity-70"
                        onClick={() => setJustDone(null)}
                        title="Left undone — it rolls into tomorrow automatically"
                      >
                        <SkipForward className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Progress</h2>
        <div className="mt-4 space-y-4">
          {activeSubjects(state).map((s) => {
            const p = subjectProgress(s);
            const done = s.chapters.filter((c) => isChapterDone(c, s)).length;
            return (
              <Link
                key={s.id}
                to="/syllabus/$subjectId"
                params={{ subjectId: s.id }}
                className="block"
              >
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">
                    {Math.round(p * 100)}% · {done}/{s.chapters.length} chapters
                  </span>
                </div>
                <ProgressBar className="mt-2" value={p} accent={s.accent} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-border p-5">
        <h2 className="font-display text-2xl">This week</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Studied</p>
            <p className="mt-1 text-lg">{hrs(week.studied)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Planned</p>
            <p className="mt-1 text-lg">{hrs(week.planned)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Chapters</p>
            <p className="mt-1 text-lg">{week.chaptersDone}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {week.ahead ? "You're on or ahead of pace." : "Slightly behind pace — small catch-ups help."}
        </p>
        <MissedDayDialog />
      </section>

      <TimeLogSheet target={pendingLog} onClose={() => setPendingLog(null)} />
    </AppShell>
  );
}
