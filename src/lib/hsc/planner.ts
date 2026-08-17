import { DIFFICULTY_HOURS, type AppState, type Chapter, type Subject } from "./types";

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

export const chapterEstimate = (c: Chapter) =>
  c.estimateOverride ?? DIFFICULTY_HOURS[c.difficulty];

export const stepHours = (c: Chapter, s: Subject) =>
  chapterEstimate(c) / Math.max(1, s.strategy.length);

export const chapterRemaining = (c: Chapter, s: Subject) =>
  Math.max(0, s.strategy.length - c.done.length) * stepHours(c, s);

export const chapterProgress = (c: Chapter, s: Subject) =>
  s.strategy.length ? c.done.length / s.strategy.length : 0;

export const isChapterDone = (c: Chapter, s: Subject) =>
  s.strategy.length > 0 && c.done.length >= s.strategy.length;

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

export const computeFeasibility = (state: AppState): Feasibility => {
  const remaining = totalRemainingHours(state);
  const today = todayKey();
  const daily = Math.max(0.5, state.settings.hoursPerDay || 6);

  if (state.settings.mode === "target" && state.settings.targetDate) {
    const daysLeft = Math.max(1, daysBetween(today, state.settings.targetDate));
    const requiredDaily = remaining / daysLeft;
    const earliestDays = Math.ceil(remaining / MAX_SANE_DAILY);
    return {
      mode: "target",
      remainingHours: remaining,
      daysLeft,
      requiredDaily,
      finishDate: state.settings.targetDate,
      realistic: requiredDaily <= MAX_SANE_DAILY,
      earliestRealisticDate: addDays(today, Math.max(1, earliestDays)),
      dailyHours: Math.min(requiredDaily, MAX_SANE_DAILY),
    };
  }

  const days = Math.ceil(remaining / daily);
  return {
    mode: "hours",
    remainingHours: remaining,
    daysLeft: days,
    requiredDaily: daily,
    finishDate: addDays(today, Math.max(0, days)),
    realistic: daily <= MAX_SANE_DAILY,
    earliestRealisticDate: addDays(today, Math.ceil(remaining / MAX_SANE_DAILY)),
    dailyHours: daily,
  };
};

export type Task = {
  key: string;
  subjectId: string;
  subjectName: string;
  accent: string;
  chapterId: string;
  chapterName: string;
  stepId: string;
  stepLabel: string;
  hours: number;
};

/** Round-robin across subjects so every day mixes subjects. */
export const pendingTaskQueue = (state: AppState): Task[] => {
  const queues = activeSubjects(state).map((s) => {
    const chapters = [...s.chapters].sort((a, b) => a.order - b.order);
    const tasks: Task[] = [];
    for (const c of chapters) {
      for (const step of s.strategy) {
        if (c.done.includes(step.id)) continue;
        tasks.push({
          key: `${s.id}:${c.id}:${step.id}`,
          subjectId: s.id,
          subjectName: s.name,
          accent: s.accent,
          chapterId: c.id,
          chapterName: c.name,
          stepId: step.id,
          stepLabel: step.label,
          hours: Math.round(stepHours(c, s) * 10) / 10,
        });
      }
    }
    return tasks;
  });

  const out: Task[] = [];
  let i = 0;
  while (queues.some((q) => q.length > i)) {
    for (const q of queues) if (q[i]) out.push(q[i]);
    i++;
  }
  return out;
};

export const scheduleDays = (state: AppState, dayCount = 30) => {
  const f = computeFeasibility(state);
  const budget = Math.max(0.5, f.dailyHours);
  const queue = pendingTaskQueue(state);
  const days: { date: string; tasks: Task[]; hours: number }[] = [];
  let idx = 0;
  const today = todayKey();
  for (let d = 0; d < dayCount && idx < queue.length; d++) {
    const date = addDays(today, d);
    const tasks: Task[] = [];
    let hours = 0;
    while (idx < queue.length && (hours < budget || tasks.length === 0)) {
      tasks.push(queue[idx]);
      hours += queue[idx].hours;
      idx++;
    }
    days.push({ date, tasks, hours: Math.round(hours * 10) / 10 });
  }
  return days;
};

export const todaysTasks = (state: AppState) => scheduleDays(state, 1)[0] ?? { date: todayKey(), tasks: [], hours: 0 };

export const subjectProgress = (s: Subject) => {
  const total = s.chapters.length * Math.max(1, s.strategy.length);
  const done = s.chapters.reduce((a, c) => a + c.done.length, 0);
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
