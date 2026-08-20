import {
  type AppState,
  type Chapter,
  type PlannedTask,
  type StrategyStep,
  type Subject,
} from "./types";

export const DIFFICULTY_HOURS: Record<string, number> = {
  easy: 30,
  short: 30,
  average: 40,
  medium: 40,
  hard: 50,
};

export const DEFAULT_CLASS_COUNTS: Record<string, number> = {
  easy: 6,
  short: 6,
  average: 10,
  medium: 10,
  hard: 16,
};

export const CLASS_HOURS_PER_UNIT = 1.5;

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

export const isClassStep = (st?: StrategyStep) =>
  Boolean(st?.label && /class|lecture/i.test(st.label));

/**
 * Get effective class count:
 * Priority 1: Direct user input in input box for this step (c.counts[st.id])
 * Priority 2: Any matching step count in c.counts
 * Priority 3: Explicit c.classes
 * Priority 4: Difficulty defaults (6 / 10 / 16)
 */
export const getChapterClassCount = (c: Chapter, st?: StrategyStep) => {
  if (st?.id && c?.counts?.[st.id] !== undefined && c.counts[st.id] !== null && Number(c.counts[st.id]) > 0) {
    return Number(c.counts[st.id]);
  }
  if (c?.counts) {
    for (const key of Object.keys(c.counts)) {
      if (/class|lecture/i.test(key) && Number(c.counts[key]) > 0) {
        return Number(c.counts[key]);
      }
    }
  }
  if (c?.classes !== null && c?.classes !== undefined && Number(c.classes) > 0) {
    return Number(c.classes);
  }
  const diff = c?.difficulty ?? "average";
  return DEFAULT_CLASS_COUNTS[diff] ?? 10;
};

/** Determine effective difficulty: >= 20 classes forces 'hard' (50h baseline). */
export const chapterEffectiveDifficulty = (c: Chapter) => {
  const classCount = getChapterClassCount(c);
  if (classCount >= 20) {
    return "hard";
  }
  return c?.difficulty ?? "average";
};

/** Total hours reserved for class-watching (Classes x 1.5h). */
export const chapterClassHours = (c: Chapter) => {
  const count = getChapterClassCount(c);
  return count * CLASS_HOURS_PER_UNIT;
};

/**
 * Total estimated hours for a chapter:
 * Uses difficulty base (30/40/50h). If class time exceeds base budget,
 * expands chapter total to class hours + 10h practice reserve.
 */
export const chapterEstimate = (c: Chapter) => {
  if (!c) return 0;
  if (c.estimateOverride !== null && c.estimateOverride !== undefined) {
    return c.estimateOverride;
  }
  const effDiff = chapterEffectiveDifficulty(c);
  const baseBudget = DIFFICULTY_HOURS[effDiff] ?? 40;
  const classHours = chapterClassHours(c);

  return Math.max(baseBudget, classHours + 10);
};

/* ------------------------------------------------------------------ */
/* Strategy Step Calculations                                         */
/* ------------------------------------------------------------------ */

export const stepCount = (c: Chapter, st: StrategyStep) => {
  if (!st) return 1;
  if (isClassStep(st)) {
    return getChapterClassCount(c, st);
  }
  return Math.max(1, Math.round(c?.counts?.[st?.id] ?? st?.count ?? 1));
};

export const unitKeyOf = (stepId: string, index: number, count: number) =>
  count > 1 ? `${stepId}#${index}` : stepId;

export const isUnitDone = (c: Chapter, stepId: string, index: number, count: number) =>
  c?.done?.includes(stepId) || c?.done?.includes(unitKeyOf(stepId, index, count));

export const stepDoneUnits = (c: Chapter, st: StrategyStep) => {
  if (!st?.id) return 0;
  const count = stepCount(c, st);
  if (c?.done?.includes(st.id)) return count;
  let n = 0;
  for (let i = 0; i < count; i++) {
    if (c?.done?.includes(unitKeyOf(st.id, i, count))) n++;
  }
  return n;
};

export const isStepDone = (c: Chapter, st: StrategyStep) =>
  stepDoneUnits(c, st) >= stepCount(c, st);

/** Hours budgeted for an entire strategy step. */
export const stepHours = (c: Chapter, s: Subject, st: StrategyStep) => {
  if (!st) return 0;
  if (isClassStep(st)) {
    return chapterClassHours(c);
  }
  const classHours = chapterClassHours(c);
  const otherSteps = (s?.strategy ?? []).filter((x) => !isClassStep(x));
  const totalBudget = chapterEstimate(c);

  const remainingPool = Math.max(5, totalBudget - classHours);
  return remainingPool / Math.max(1, otherSteps.length);
};

/** Hours budgeted for a single unit task. */
export const unitHours = (c: Chapter, s: Subject, st: StrategyStep) => {
  if (!st) return 0;
  if (isClassStep(st)) return CLASS_HOURS_PER_UNIT;
  return stepHours(c, s, st) / stepCount(c, st);
};

export const chapterTotalUnits = (c: Chapter, s: Subject) =>
  (s?.strategy ?? []).reduce((a, st) => a + stepCount(c, st), 0);

export const chapterDoneUnits = (c: Chapter, s: Subject) =>
  (s?.strategy ?? []).reduce((a, st) => a + stepDoneUnits(c, st), 0);

export const chapterRemaining = (c: Chapter, s: Subject) =>
  (s?.strategy ?? []).reduce(
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

export const paceFactor = (subjects: Subject[]) => {
  let est = 0;
  let act = 0;
  for (const s of subjects ?? []) {
    for (const c of s?.chapters ?? []) {
      if (c?.actualHours != null) {
        est += chapterEstimate(c);
        act += c.actualHours;
      }
    }
  }
  if (est === 0) return 1;
  return Math.min(1.8, Math.max(0.6, act / est));
};

export const activeSubjects = (state: AppState) =>
  (state?.subjects ?? []).filter((s) => s?.enabled);

export const totalRemainingHours = (state: AppState) => {
  const f = paceFactor(state?.subjects ?? []);
  return (
    activeSubjects(state).reduce(
      (sum, s) => sum + (s?.chapters ?? []).reduce((a, c) => a + chapterRemaining(c, s), 0),
      0,
    ) * f
  );
};

export const totalPlannedHours = (state: AppState) =>
  activeSubjects(state).reduce(
    (sum, s) => sum + (s?.chapters ?? []).reduce((a, c) => a + chapterEstimate(c), 0),
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

export const isRevisionDay = (state: AppState, iso: string) =>
  state?.settings?.revisionWeekday === weekdayOf(iso) ||
  (state?.settings?.revisionDates ?? []).includes(iso);

export const studyDaysBetween = (state: AppState, from: string, to: string) => {
  const total = Math.max(0, daysBetween(from, to));
  let n = 0;
  for (let i = 0; i < total; i++) if (!isRevisionDay(state, addDays(from, i))) n++;
  return n;
};

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
  const daily = Math.max(0.5, state?.settings?.hoursPerDay || 6);

  if (state?.settings?.mode === "target" && state?.settings?.targetDate) {
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
  t?.unitCount > 1 ? `${t?.stepLabel ?? ""} ${t.unitIndex + 1}/${t.unitCount}` : t?.stepLabel ?? "";

export const pendingTasksBySubject = (
  state: AppState,
  plannedHours: Record<string, number> = {},
): { task: Task; left: number }[][] =>
  activeSubjects(state).map((s) => {
    const chapters = [...(s?.chapters ?? [])].sort((a, b) => a.order - b.order);
    const items: { task: Task; left: number }[] = [];
    for (const c of chapters) {
      for (const st of s?.strategy ?? []) {
        if (!st) continue;
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

export const savedDayPlan = (state: AppState, date: string): Task[] | undefined =>
  state?.dayPlans?.[date];

export const scheduleDays = (state: AppState, dayCount = 30): ScheduledDay[] => {
  const f = computeFeasibility(state);
  const budget = Math.max(0.5, f.dailyHours);
  const today = todayKey();
  const frozen = savedDayPlan(state, today);
  const queues = pendingTasksBySubject(state, plannedMap(frozen));
  const n = queues.length;
  if (n === 0) return [];

  const perDay = Math.min(Math.max(1, state?.settings?.subjectsPerDay || 1), Math.max(1, n));
  const days: ScheduledDay[] = [];

  const remainingTasks = () => queues.some((q) => q.length > 0);

  const drain = (qi: number, allot: number, date: string, out: Task[]) => {
    let left = allot;
    const q = queues[qi];
    if (!q) return 0;
    while (left > 0.05 && q.length > 0) {
      const item = q[0];
      if (!item) break;
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

    // Advance subject selection starting point every day to enforce continuous rotation
    const startIdx = (d * perDay) % n;
    const picked: number[] = [];

    for (let k = 0; k < n && picked.length < perDay; k++) {
      const idx = (startIdx + k) % n;
      if (queues[idx] && queues[idx].length > 0) picked.push(idx);
    }

    const tasks: Task[] = [];
    let hours = 0;
    const share = budget / Math.max(1, picked.length);
    for (const idx of picked) hours += drain(idx, share, date, tasks);

    for (let idx = 0; idx < n && budget - hours > 0.05; idx++) {
      if (picked.includes(idx)) continue;
      hours += drain(idx, budget - hours, date, tasks);
    }

    days.push({ date, tasks, hours: Math.round(hours * 10) / 10, revision: false });
  }
  return days;
};

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

export const nextTaskAhead = (state: AppState): Task | null => {
  const today = todayKey();
  const frozen = savedDayPlan(state, today) ?? [];
  const q = pendingTaskQueue(state, plannedMap(frozen));
  return q[0] ?? null;
};

export const subjectProgress = (s: Subject) => {
  const total = (s?.chapters ?? []).reduce((a, c) => a + chapterTotalUnits(c, s), 0);
  const done = (s?.chapters ?? []).reduce((a, c) => a + chapterDoneUnits(c, s), 0);
  return total ? done / total : 0;
};

export const streakCount = (
  logs: Record<string, { completedHours: number; plannedHours: number; missed?: boolean }>,
) => {
  let n = 0;
  let cursor = todayKey();
  for (let i = 0; i < 365; i++) {
    const l = logs?.[cursor];
    const met =
      l && !l.missed && l.completedHours > 0 && l.completedHours >= l.plannedHours * 0.999;
    if (met) {
      n++;
    } else if (i > 0) {
      break;
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
    const l = state?.logs?.[addDays(today, -i)];
    if (l) {
      studied += l.completedHours;
      planned += l.plannedHours;
    }
  }
  const chaptersDone = activeSubjects(state).reduce(
    (a, s) => a + (s?.chapters ?? []).filter((c) => isChapterDone(c, s)).length,
    0,
  );
  return {
    studied: Math.round(studied * 10) / 10,
    planned: Math.round(planned * 10) / 10,
    chaptersDone,
    ahead: studied >= planned,
  };
};
