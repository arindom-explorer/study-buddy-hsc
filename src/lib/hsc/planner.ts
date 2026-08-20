import {
  DIFFICULTY_HOURS,
  type AppState,
  type Chapter,
  type PlannedTask,
  type StrategyStep,
  type Subject,
} from "./types";

export const todayKey = (d: Date = new Date()) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return todayKey(d);
};

export const daysBetween = (a: string, b: string) =>
  Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000,
  );

export const prettyDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
const CLASS_HOURS_PER_UNIT = 1.5;

/** Total hours reserved for class-watching within a chapter. */
export const chapterClassHours = (c: Chapter) =>
  c.classes !== null && c.classes > 0 ? c.classes * CLASS_HOURS_PER_UNIT : 0;

/**
 * Calculate estimated hours for a chapter.
 * Priority:
 * 1. estimateOverride (manual override)
 * 2. classHours + difficulty baseline (if classes is set) — class time sits
 *    on top of the other strategy steps, not instead of them.
 * 3. DIFFICULTY_HOURS[difficulty] (default by difficulty)
 */
export const chapterEstimate = (c: Chapter) => {
  if (c.estimateOverride !== null) return c.estimateOverride;
  const classHours = chapterClassHours(c);
  const base = DIFFICULTY_HOURS[chapterEffectiveDifficulty(c)];
  return classHours > 0 ? classHours + base : base;
};

/**
 * Determine effective difficulty for auto-categorization.
 * If classes > 20, return "hard"; otherwise use the set difficulty.
 */
export const chapterEffectiveDifficulty = (c: Chapter) => {
  if (c.classes !== null && c.classes > 20) return "hard";
  return c.difficulty;
};

/* ------------------------------------------------------------------ */
/* Multi-count strategy steps                                          */
/* ------------------------------------------------------------------ */

/** How many individually trackable units this step has for this chapter. */
export const stepCount = (c: Chapter, st: StrategyStep) =>
  Math.max(1, Math.round(c.counts?.[st.id] ?? st.count ?? 1));

/** Stable id for a single unit of a step. */
export const unitKeyOf = (stepId: string, index: number, count: number) =>
  count > 1 ? `${stepId}#${index}` : stepId;

export const isUnitDone = (c: Chapter, stepId: string, index: number, count: number) =>
  c.done.includes(stepId) || c.done.includes(unitKeyOf(stepId, index, count));

export const stepDoneUnits = (c: Chapter, st: StrategyStep) => {
  const count = stepCount(c, st);
  if (c.done.includes(st.id)) return count;
  let n = 0;
  for (let i = 0; i < count; i++) if (c.done.includes(unitKeyOf(st.id, i, count))) n++;
  return n;
};

export const isStepDone = (c: Chapter, st: StrategyStep) =>
  stepDoneUnits(c, st) >= stepCount(c, st);


/** True for the strategy step that represents watching classes/lectures. */
export const isClassStep = (st: StrategyStep) => /class/i.test(st.label);

/** Hours budgeted for a whole strategy step of this chapter. */
export const stepHours = (c: Chapter, s: Subject, st: StrategyStep) => {
  const classHours = chapterClassHours(c);
  if (classHours > 0 && isClassStep(st)) return classHours;
  const otherSteps = s.strategy.filter((x) => !(classHours > 0 && isClassStep(x)));
  const remaining = chapterEstimate(c) - classHours;
  return remaining / Math.max(1, otherSteps.length);
};

/** Hours budgeted for one unit of a step. */
export const unitHours = (c: Chapter, s: Subject, st: StrategyStep) =>
  stepHours(c, s, st) / stepCount(c, st);




export const chapterTotalUnits = (c: Chapter, s: Subject) =>
  s.strategy.reduce((a, st) => a + stepCount(c, st), 0);

export const chapterDoneUnits = (c: Chapter, s: Subject) =>
  s.strategy.reduce((a, st) => a + stepDoneUnits(c, st), 0);

export const chapterRemaining = (c: Chapter, s: Subject) =>
  s.strategy.reduce(
    (a, st) => a + (stepCount(c, st) - stepDoneUnits(c, st)) * unitHours(c, s, st),
    0,
  );

export const chapterProgress = (c: Chapter, s: Subject) => {
  const total = chapterTotalUnits(c, s);
  return total ? chapterDoneUnits(c, s) / total : 0;
};

export const isChapterDone = (c: Chapter, s: Subject) => {
  const total = chapterTotalUnits(c, s);
  return total > 0 && chapterDoneUnits(c, s) >= total;
};

/** Ratio of actual to estimated hours from logged chapters; 1 = on model. */
export const paceFactor = (subjects: Subject[]) => {
  let est = 0;
  let act = 0;
  for (const s of subjects) {
    for (const c of s.chapters) {
      if (c.actualHours != null) {
        est += chapterEstimate(c);
        act += c.actualHours;
      }
    }
  }
  if (est === 0) return 1;
  return Math.min(1.8, Math.max(0.6, act / est));
};

export const activeSubjects = (state: AppState) => state.subjects.filter((s) => s.enabled);

export const totalRemainingHours = (state: AppState) => {
  const f = paceFactor(state.subjects);
  return (
    activeSubjects(state).reduce(
      (sum, s) => sum + s.chapters.reduce((a, c) => a + chapterRemaining(c, s), 0),
      0,
    ) * f
  );
};

export const totalPlannedHours = (state: AppState) =>
  activeSubjects(state).reduce(
    (sum, s) => sum + s.chapters.reduce((a, c) => a + chapterEstimate(c), 0),
    0,
  );

export type Feasibility = {
  mode: "target" | "hours";
  remainingHours: number;
  daysLeft: number;
  requiredDaily: number;
  finishDate: string;
  realistic: boolean;
  earliestRealisticDate: string;
  dailyHours: number;
};

const MAX_SANE_DAILY = 14;

export const weekdayOf = (iso: string) => new Date(iso + "T00:00:00").getDay();

/** A revision day carries no new chapter work. */
export const isRevisionDay = (state: AppState, iso: string) =>
  state.settings.revisionWeekday === weekdayOf(iso) ||
  (state.settings.revisionDates ?? []).includes(iso);

/** Count days that are available for new syllabus work between two dates. */
export const studyDaysBetween = (state: AppState, from: string, to: string) => {
  const total = Math.max(0, daysBetween(from, to));
  let n = 0;
  for (let i = 0; i < total; i++) if (!isRevisionDay(state, addDays(from, i))) n++;
  return n;
};

/** Walk forward until `need` study days have passed; returns the date reached. */
export const dateAfterStudyDays = (state: AppState, from: string, need: number) => {
  let left = Math.max(0, Math.ceil(need));
  let i = 0;
  while (left > 0 && i < 3650) {
    i++;
    if (!isRevisionDay(state, addDays(from, i - 1))) left--;
  }
  return addDays(from, i);
};

export const computeFeasibility = (state: AppState): Feasibility => {
  const remaining = totalRemainingHours(state);
  const today = todayKey();
  const daily = Math.max(0.5, state.settings.hoursPerDay || 6);

  if (state.settings.mode === "target" && state.settings.targetDate) {
    const daysLeft = Math.max(1, studyDaysBetween(state, today, state.settings.targetDate));
    const requiredDaily = remaining / daysLeft;
    const earliestDays = Math.ceil(remaining / MAX_SANE_DAILY);
    return {
      mode: "target",
      remainingHours: remaining,
      daysLeft,
      requiredDaily,
      finishDate: state.settings.targetDate,
      realistic: requiredDaily <= MAX_SANE_DAILY,
      earliestRealisticDate: dateAfterStudyDays(state, today, Math.max(1, earliestDays)),
      dailyHours: Math.min(requiredDaily, MAX_SANE_DAILY),
    };
  }

  const days = Math.ceil(remaining / daily);
  return {
    mode: "hours",
    remainingHours: remaining,
    daysLeft: days,
    requiredDaily: daily,
    finishDate: dateAfterStudyDays(state, today, Math.max(0, days)),
    realistic: daily <= MAX_SANE_DAILY,
    earliestRealisticDate: dateAfterStudyDays(state, today, Math.ceil(remaining / MAX_SANE_DAILY)),
    dailyHours: daily,
  };
};

export type Task = PlannedTask;

export const unitLabel = (t: Pick<PlannedTask, "stepLabel" | "unitIndex" | "unitCount">) =>
  t.unitCount > 1 ? `${t.stepLabel} ${t.unitIndex + 1}/${t.unitCount}` : t.stepLabel;

/**
 * Pending (not yet completed) work units grouped per subject, in chapter/strategy order.
 * `plannedHours` lets the caller discount work already frozen into today's plan.
 */
export const pendingTasksBySubject = (
  state: AppState,
  plannedHours: Record<string, number> = {},
): { task: Task; left: number }[][] =>
  activeSubjects(state).map((s) => {
    const chapters = [...s.chapters].sort((a, b) => a.order - b.order);
    const items: { task: Task; left: number }[] = [];
    for (const c of chapters) {
      for (const st of s.strategy) {
        const count = stepCount(c, st);
        const per = unitHours(c, s, st);
        for (let i = 0; i < count; i++) {
          if (isUnitDone(c, st.id, i, count)) continue;
          const unitKey = unitKeyOf(st.id, i, count);
          const key = `${s.id}:${c.id}:${unitKey}`;
          const left = per - (plannedHours[key] ?? 0);
          if (left <= 0.05) continue;
          items.push({
            task: {
              key,
              id: key,
              subjectId: s.id,
              subjectName: s.name,
              accent: s.accent,
              chapterId: c.id,
              chapterName: c.name,
              stepId: st.id,
              stepLabel: st.label,
              unitKey,
              unitIndex: i,
              unitCount: count,
              hours: Math.round(per * 10) / 10,
            },
            left,
          });
        }
      }
    }
    return items;
  });

/** Flat round-robin queue across subjects. */
export const pendingTaskQueue = (
  state: AppState,
  plannedHours: Record<string, number> = {},
): Task[] => {
  const queues = pendingTasksBySubject(state, plannedHours);
  const out: Task[] = [];
  let i = 0;
  while (queues.some((q) => q.length > i)) {
    for (const q of queues) {
      const t = q[i];
      if (t) out.push(t.task);
    }
    i++;
  }
  return out;
};

export type ScheduledDay = { date: string; tasks: Task[]; hours: number; revision: boolean };

const plannedMap = (tasks: Task[] | undefined) => {
  const m: Record<string, number> = {};
  for (const t of tasks ?? []) m[t.key] = (m[t.key] ?? 0) + t.hours;
  return m;
};

/** The frozen plan for a date, if one has been saved. */
export const savedDayPlan = (state: AppState, date: string): Task[] | undefined =>
  state.dayPlans?.[date];

/**
 * Builds the day-by-day plan.
 * Today's plan, once frozen, is used verbatim (so checking a task off never
 * pulls the next one in) and its work is excluded from later days.
 * Each study day covers `subjectsPerDay` subjects, splitting the day's hours
 * equally between them and rotating through the active subjects. Revision days
 * stay free of new work.
 */
export const scheduleDays = (state: AppState, dayCount = 30): ScheduledDay[] => {
  const f = computeFeasibility(state);
  const budget = Math.max(0.5, f.dailyHours);
  const today = todayKey();
  const frozen = savedDayPlan(state, today);
  const queues = pendingTasksBySubject(state, plannedMap(frozen));
  const n = queues.length;
  const perDay = Math.min(Math.max(1, state.settings.subjectsPerDay || 1), Math.max(1, n));
  const days: ScheduledDay[] = [];
  let cursor = 0;

  const remainingTasks = () => queues.some((q) => q.length > 0);

  const drain = (qi: number, allot: number, date: string, out: Task[]) => {
    let left = allot;
    const q = queues[qi]!;
    while (left > 0.05 && q.length > 0) {
      const item = q[0]!;
      const take = Math.min(item.left, left);
      out.push({
        ...item.task,
        id: `${item.task.key}@${date}#${out.length}`,
        hours: Math.round(take * 10) / 10,
      });
      item.left -= take;
      left -= take;
      if (item.left <= 0.05) q.shift();
    }
    return allot - left;
  };

  for (let d = 0; d < dayCount; d++) {
    const date = addDays(today, d);

    if (d === 0 && frozen) {
      const hours = frozen.reduce((a, t) => a + t.hours, 0);
      days.push({
        date,
        tasks: frozen,
        hours: Math.round(hours * 10) / 10,
        revision: isRevisionDay(state, date) && frozen.length === 0,
      });
      continue;
    }

    if (!remainingTasks()) break;
    if (isRevisionDay(state, date)) {
      days.push({ date, tasks: [], hours: 0, revision: true });
      continue;
    }

    const picked: number[] = [];
    for (let k = 0; k < n && picked.length < perDay; k++) {
      const idx = (cursor + k) % n;
      if (queues[idx]!.length > 0) picked.push(idx);
    }
    cursor = (cursor + perDay) % n;

    const tasks: Task[] = [];
    let hours = 0;
    const share = budget / Math.max(1, picked.length);
    for (const idx of picked) hours += drain(idx, share, date, tasks);

    // top up from other subjects if the picked ones ran out of work
    for (let idx = 0; idx < n && budget - hours > 0.05; idx++) {
      if (picked.includes(idx)) continue;
      hours += drain(idx, budget - hours, date, tasks);
    }

    days.push({ date, tasks, hours: Math.round(hours * 10) / 10, revision: false });
  }
  return days;
};

/** Today's plan — the frozen one when it exists, otherwise a freshly built one. */
export const todaysTasks = (state: AppState): ScheduledDay => {
  const today = todayKey();
  const frozen = savedDayPlan(state, today);
  if (frozen) {
    const hours = frozen.reduce((a, t) => a + t.hours, 0);
    return {
      date: today,
      tasks: frozen,
      hours: Math.round(hours * 10) / 10,
      revision: isRevisionDay(state, today) && frozen.length === 0,
    };
  }
  return (
    scheduleDays(state, 1)[0] ?? {
      date: today,
      tasks: [],
      hours: 0,
      revision: isRevisionDay(state, today),
    }
  );
};

/** The next not-yet-planned unit of work, for the "study ahead" action. */
export const nextTaskAhead = (state: AppState): Task | null => {
  const today = todayKey();
  const frozen = savedDayPlan(state, today) ?? [];
  const q = pendingTaskQueue(state, plannedMap(frozen));
  return q[0] ?? null;
};

export const subjectProgress = (s: Subject) => {
  const total = s.chapters.reduce((a, c) => a + chapterTotalUnits(c, s), 0);
  const done = s.chapters.reduce((a, c) => a + chapterDoneUnits(c, s), 0);
  return total ? done / total : 0;
};

export const streakCount = (logs: Record<string, { completedHours: number; plannedHours: number; missed?: boolean }>) => {
  let n = 0;
  let cursor = todayKey();
  // today counts only if the plan was met
  for (let i = 0; i < 365; i++) {
    const l = logs[cursor];
    const met = l && !l.missed && l.completedHours > 0 && l.completedHours >= l.plannedHours * 0.999;
    if (met) {
      n++;
    } else if (i > 0) {
      break;
    } else if (!met) {
      // today unfinished — keep counting from yesterday
    }
    cursor = addDays(cursor, -1);
  }
  return n;
};

export const weekSummary = (state: AppState) => {
  const today = todayKey();
  let studied = 0;
  let planned = 0;
  for (let i = 0; i < 7; i++) {
    const l = state.logs[addDays(today, -i)];
    if (l) {
      studied += l.completedHours;
      planned += l.plannedHours;
    }
  }
  const chaptersDone = activeSubjects(state).reduce(
    (a, s) => a + s.chapters.filter((c) => isChapterDone(c, s)).length,
    0,
  );
  return {
    studied: Math.round(studied * 10) / 10,
    planned: Math.round(planned * 10) / 10,
    chaptersDone,
    ahead: studied >= planned,
  };
};
