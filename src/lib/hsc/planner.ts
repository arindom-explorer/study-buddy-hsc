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

/** Pending tasks grouped per subject, in chapter/strategy order. */
export const pendingTasksBySubject = (state: AppState): Task[][] =>
  activeSubjects(state).map((s) => {
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

/** Round-robin across subjects so every day mixes subjects. */
export const pendingTaskQueue = (state: AppState): Task[] => {
  const queues = pendingTasksBySubject(state);
  const out: Task[] = [];
  let i = 0;
  while (queues.some((q) => q.length > i)) {
    for (const q of queues) {
      const t = q[i];
      if (t) out.push(t);
    }
    i++;
  }
  return out;
};

export type ScheduledDay = { date: string; tasks: Task[]; hours: number; revision: boolean };

/**
 * Builds the day-by-day plan.
 * Each study day covers `subjectsPerDay` subjects, splitting the day's hours
 * equally between them and rotating through the active subjects so every
 * subject gets an equal share of the week. Long steps are spread over several
 * days instead of blowing the daily budget. Revision days stay free of new work.
 */
export const scheduleDays = (state: AppState, dayCount = 30): ScheduledDay[] => {
  const f = computeFeasibility(state);
  const budget = Math.max(0.5, f.dailyHours);
  const queues = pendingTasksBySubject(state).map((q) =>
    q.map((t) => ({ task: t, left: t.hours })),
  );
  const n = queues.length;
  const perDay = Math.min(Math.max(1, state.settings.subjectsPerDay || 1), Math.max(1, n));
  const days: ScheduledDay[] = [];
  const today = todayKey();
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
        key: `${item.task.key}@${date}#${out.length}`,
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

export const todaysTasks = (state: AppState) =>
  scheduleDays(state, 1)[0] ?? { date: todayKey(), tasks: [], hours: 0, revision: false };

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
