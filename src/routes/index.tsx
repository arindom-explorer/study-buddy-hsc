import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flame, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/hsc/AppShell";
import { ProgressBar, SoftCallout, SubjectTag, hrs } from "@/components/hsc/ui-bits";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/hsc/store";
import {
  activeSubjects,
  chapterDoneUnits,
  chapterTotalUnits,
  computeFeasibility,
  isChapterDone,
  nextTaskAhead,
  prettyDate,
  scheduleDays,
  streakCount,
  subjectProgress,
  dayLabel,
  unitLabel,
  weekSummary,
} from "@/lib/hsc/planner";
import { TimeLogSheet } from "@/components/hsc/TimeLogSheet";
import { MissedDayDialog } from "@/components/hsc/MissedDayDialog";
import { cn } from "@/lib/utils";
import type { PlannedTask } from "@/lib/hsc/types";

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
  const { state, hydrated, toggleUnit, setSettings, ensureDayPlan, studyAhead } = useStore();

  const [dayIndex, setDayIndex] = useState<number>(0);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [pendingLog, setPendingLog] = useState<{ subjectId: string; chapterId: string } | null>(
    null,
  );

  const onboarded = state.settings.onboarded;

  useEffect(() => {
    if (hydrated && onboarded) ensureDayPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, onboarded]);

  const feas = useMemo(() => computeFeasibility(state), [state]);
  const week = useMemo(() => weekSummary(state), [state]);
  const ahead = useMemo(() => nextTaskAhead(state), [state]);
  const streak = streakCount(state.logs);

  // Generate 60 days of planned schedule dynamically
  const scheduledDays = useMemo(() => scheduleDays(state, 60), [state]);
  
  // Get the selected day based on left/right arrow clicks
  const currentDay = scheduledDays[dayIndex] ?? scheduledDays[0];

  const isDone = (t: PlannedTask) => {
    const c = state.subjects
      .find((s) => s.id === t.subjectId)
      ?.chapters.find((x) => x.id === t.chapterId);
    return !!c && (c.done.includes(t.unitKey) || c.done.includes(t.stepId));
  };

  if (!hydrated) return <AppShell>{null}</AppShell>;

  if (!onboarded) {
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

  const grouped = currentDay.tasks.reduce<Record<string, PlannedTask[]>>((acc, t) => {
    (acc[t.subjectId] ??= []).push(t);
    return acc;
  }, {});

  const doneCount = currentDay.tasks.filter(isDone).length;
  const remainingCount = currentDay.tasks.length - doneCount;
  const overload = currentDay.hours > state.settings.hoursPerDay + 0.5;
  const allDone = currentDay.tasks.length > 0 && remainingCount === 0;
  const emptyDay = currentDay.tasks.length === 0 && !currentDay.revision;

  const onComplete = (t: PlannedTask) => {
    if (isDone(t)) {
      toggleUnit(t.subjectId, t.chapterId, t.unitKey);
      return;
    }
    setJustDone(t.id);
    setTimeout(() => setJustDone(null), 600);
    toggleUnit(t.subjectId, t.chapterId, t.unitKey);
    const subject = state.subjects.find((s) => s.id === t.subjectId);
    const chapter = subject?.chapters.find((c) => c.id === t.chapterId);
    if (subject && chapter) {
      const total = chapterTotalUnits(chapter, subject);
      if (chapterDoneUnits(chapter, subject) + 1 >= total)
        setPendingLog({ subjectId: t.subjectId, chapterId: t.chapterId });
    }
  };

  const StudyAheadButton = () => (
    <Button
      variant="outline"
      size="sm"
      className="mt-4 w-full min-w-0 justify-center gap-2 whitespace-nowrap"
      disabled={!ahead}
      onClick={() => studyAhead()}
    >
      <Plus className="size-4 shrink-0" />
      <span className="truncate">
        {ahead ? `Study ahead — ${ahead.chapterName}: ${unitLabel(ahead)}` : "Nothing left to pull in"}
      </span>
    </Button>
  );

  return (
    <AppShell>
      <header className="animate-rise">
        <div className="flex items-center gap-2">
          {/* Previous Day Arrow Button */}
          <button
            aria-label="Previous plan day"
            disabled={dayIndex === 0}
            onClick={() => setDayIndex((prev) => Math.max(0, prev - 1))}
            className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40 active:scale-95"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Dynamic Day Label */}
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {dayLabel(currentDay.day)} · {prettyDate(currentDay.date)}
          </p>

          {/* Next Day Arrow Button */}
          <button
            aria-label="Next plan day"
            onClick={() => setDayIndex((prev) => Math.min(scheduledDays.length - 1, prev + 1))}
            className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent active:scale-95"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <h1 className="mt-1 font-display text-4xl">
          {dayIndex === 0 ? "Today" : `Day ${dayIndex + 1}`}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Flame className="size-4" /> {streak} day streak
          </span>
          <span>{hrs(currentDay.hours)} planned</span>
          <span>
            {feas.mode === "target"
              ? `${hrs(feas.requiredDaily)}/day needed`
              : `finish ${prettyDate(feas.finishDate)}`}
          </span>
        </div>
        {currentDay.tasks.length > 0 && (
          <div className="mt-4">
            <ProgressBar value={doneCount / currentDay.tasks.length} />
            <p className="mt-2 text-xs text-muted-foreground">
              {doneCount}/{currentDay.tasks.length} tasks done
            </p>
          </div>
        )}
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
          This day&apos;s load is {hrs(currentDay.hours)} but you usually have{" "}
          {hrs(state.settings.hoursPerDay)}.
        </p>
      )}

      <section className="mt-8 space-y-8">
        {currentDay.revision ? (
          <div className="animate-rise rounded-2xl border border-border p-8 text-center">
            <Sparkles className="mx-auto size-6 text-muted-foreground" />
            <h2 className="mt-3 font-display text-2xl">Revision day</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No new chapters today. Go back over what this week covered.
            </p>
            <div className="mx-auto mt-4 max-w-xs">
              <StudyAheadButton />
            </div>
          </div>
        ) : emptyDay ? (
          <div className="animate-rise rounded-2xl border border-border p-8 text-center">
            <Sparkles className="mx-auto size-6 text-muted-foreground" />
            <h2 className="mt-3 font-display text-2xl">Nothing scheduled</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The syllabus is clear for this day. You can still pull work forward.
            </p>
            <div className="mx-auto mt-4 max-w-xs">
              <StudyAheadButton />
            </div>
          </div>
        ) : (
          Object.entries(grouped).map(([subjectId, tasks]) => {
            const subject = state.subjects.find((s) => s.id === subjectId)!;
            return (
              <div key={subjectId} className="animate-rise">
                <SubjectTag accent={subject.accent} label={subject.name} />
                <ul className="mt-3 space-y-2">
                  {tasks.map((t) => {
                    const done = isDone(t);
                    const chapter = subject.chapters.find((c) => c.id === t.chapterId);
                    const stepDone = chapter
                      ? chapter.done.includes(t.stepId)
                        ? t.unitCount
                        : chapter.done.filter((x) => x.startsWith(`${t.stepId}#`)).length
                      : 0;
                    return (
                      <li
                        key={t.id}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors",
                          done && "bg-muted/40",
                        )}
                        style={{ borderLeft: `3px solid var(--${t.accent})` }}
                      >
                        <button
                          aria-label={`${done ? "Undo" : "Complete"} ${unitLabel(t)}`}
                          onClick={() => onComplete(t)}
                          className={cn(
                            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border transition-colors hover:bg-accent active:scale-95",
                            done && "border-foreground bg-foreground text-background",
                            justDone === t.id && "animate-pop",
                          )}
                        >
                          <Check className={cn("size-3.5", done ? "opacity-100" : "opacity-70")} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-medium transition-all",
                              done && "text-muted-foreground line-through",
                            )}
                          >
                            {t.chapterName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {unitLabel(t)} · {hrs(t.hours)}
                            {t.pulled && " · pulled ahead"}
                            {done && " · done"}
                          </p>
                          {t.unitCount > 1 && (
                            <div className="mt-2 flex items-center gap-2">
                              <ProgressBar
                                className="max-w-32"
                                value={stepDone / t.unitCount}
                                accent={t.accent}
                              />
                              <span className="text-[11px] text-muted-foreground">
                                {stepDone}/{t.unitCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}

        {!emptyDay && !currentDay.revision && (
          <div>
            {allDone && (
              <div className="animate-rise rounded-2xl border border-border p-6 text-center">
                <Sparkles className="mx-auto size-6 text-muted-foreground" />
                <h2 className="mt-3 font-display text-2xl">Day complete</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Everything planned for this day is done. Rest, or pull tomorrow&apos;s first task in.
                </p>
              </div>
            )}
            <StudyAheadButton />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Nothing is pulled in automatically — the rest stays on its scheduled day.
            </p>
          </div>
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
