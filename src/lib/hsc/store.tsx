import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { seedState } from "./seed";
import {
  addDays,
  isRevisionDay,
  nextTaskAhead,
  scheduleDays,
  stepCount,
  todayKey,
  unitHours,
  unitKeyOf,
} from "./planner";
import type { AppState, Difficulty, PlannedTask, Settings, Subject } from "./types";

const KEY = "hsc-tracker-v1";

type Ctx = {
  state: AppState;
  hydrated: boolean;
  update: (fn: (draft: AppState) => void) => void;
  toggleStep: (subjectId: string, chapterId: string, stepId: string) =>
    update((d) => {
      const { s, c } = findChapter(d, subjectId, chapterId);
      if (!s || !c) return;
      const st = s.strategy.find((x) => x.id === stepId);
      if (!st) return;
      const count = stepCount(c, st);
      const keys = Array.from({ length: count }, (_, i) => unitKeyOf(stepId, i, count));
      const doneNow = keys.every((k) => c.done.includes(k) || c.done.includes(stepId));
      const per = unitHours(c, s, st);
      const delta = doneNow
        ? -per * keys.filter((k) => c.done.includes(k) || c.done.includes(stepId)).length
        : per * keys.filter((k) => !c.done.includes(k) && !c.done.includes(stepId)).length;
      c.done = doneNow
        ? c.done.filter((x) => x !== stepId && !keys.includes(x))
        : Array.from(new Set([...c.done.filter((x) => !keys.includes(x)), ...keys]));
      logHours(d, delta);
    }),
  toggleUnit: (subjectId: string, chapterId: string, unitKey: string) =>
    update((d) => {
      const { s, c } = findChapter(d, subjectId, chapterId);
      if (!s || !c) return;
      const stepId = unitKey.split("#")[0]!;
      const st = s.strategy.find((x) => x.id === stepId);
      if (!st) return;
      const count = stepCount(c, st);
      const per = unitHours(c, s, st);
      // expand a whole-step marker into individual units before untoggling one
      if (c.done.includes(stepId) && count > 1) {
        c.done = [
          ...c.done.filter((x) => x !== stepId),
          ...Array.from({ length: count }, (_, i) => unitKeyOf(stepId, i, count)),
        ];
      }
      const has = c.done.includes(unitKey);
      c.done = has ? c.done.filter((x) => x !== unitKey) : [...c.done, unitKey];
      logHours(d, has ? -per : per);
    }),
  setStepCount: (subjectId: string, chapterId: string, stepId: string, count: number) =>
    update((d) => {
      const { c } = findChapter(d, subjectId, chapterId);
      if (!c) return;
      const n = Math.max(1, Math.min(200, Math.round(count) || 1));
      c.counts = { ...(c.counts ?? {}), [stepId]: n };
      // drop completions for units that no longer exist
      c.done = c.done.filter((x) => {
        if (!x.startsWith(`${stepId}#`)) return true;
        return Number(x.slice(stepId.length + 1)) < n;
      });
    }),
  ensureDayPlan: () =>
    update((d) => {
      const key = todayKey();
      d.dayPlans = d.dayPlans ?? {};
      // keep the store tidy: drop plans older than two weeks
      for (const k of Object.keys(d.dayPlans)) {
        if (k < addDays(key, -14)) delete d.dayPlans[k];
      }
      if (d.dayPlans[key]) return;
      if (isRevisionDay(d, key)) {
        d.dayPlans[key] = [];
        return;
      }
      const day = scheduleDays(d, 1)[0];
      d.dayPlans[key] = day?.tasks ?? [];
      const log = d.logs[key] ?? { date: key, completedHours: 0, plannedHours: 0 };
      log.plannedHours = day?.hours ?? 0;
      d.logs[key] = log;
    }),
  studyAhead: () =>
    update((d) => {
      const key = todayKey();
      d.dayPlans = d.dayPlans ?? {};
      const next = nextTaskAhead(d);
      if (!next) return;
      const list = d.dayPlans[key] ?? [];
      const task: PlannedTask = {
        ...next,
        id: `${next.key}@${key}#ahead${list.length}`,
        pulled: true,
      };
      d.dayPlans[key] = [...list, task];
      const log = d.logs[key] ?? { date: key, completedHours: 0, plannedHours: 0 };
      log.plannedHours = (log.plannedHours ?? 0) + task.hours;
      d.logs[key] = log;
    }),
  setDifficulty: (subjectId: string, chapterId: string, diff: Difficulty) =>
    update((d) => {
      const { c } = findChapter(d, subjectId, chapterId);
      if (c) c.difficulty = diff;
    }),
  setEstimate: (subjectId: string, chapterId: string, hours: number | null) =>
    update((d) => {
      const { c } = findChapter(d, subjectId, chapterId);
      if (c) c.estimateOverride = hours;
    }),
  logActual: (
    subjectId: string,
    chapterId: string,
    kind: "less" | "right" | "longer" | number,
  ) =>
    update((d) => {
      const { c } = findChapter(d, subjectId, chapterId);
      if (!c) return;
      const base = chapterEstimate(c);
      const current = c.actualHours ?? base;
      if (typeof kind === "number") c.actualHours = Math.max(1, current + kind);
      else if (kind === "less") c.actualHours = Math.round(base * 0.75);
      else if (kind === "right") c.actualHours = base;
      else c.actualHours = Math.round(base * 1.3);
    }),
  setSettings: (patch: Partial<Settings>) =>
    update((d) => {
      d.settings = { ...d.settings, ...patch };
    }),
  setStrategy: (subjectId: string, steps: Subject["strategy"]) =>
    update((d) => {
      const s = d.subjects.find((x) => x.id === subjectId);
      if (!s) return;
      const valid = new Set(steps.map((x) => x.id));
      s.strategy = steps;
      for (const c of s.chapters) c.done = c.done.filter((x) => valid.has(x));
    }),
  moveChapter: (subjectId: string, chapterId: string, dir: -1 | 1) =>
    update((d) => {
      const s = d.subjects.find((x) => x.id === subjectId);
      if (!s) return;
      const sorted = [...s.chapters].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((c) => c.id === chapterId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return;
      const A = sorted[i]!;
      const B = sorted[j]!;
      const tmp = A.order;
      A.order = B.order;
      B.order = tmp;
    }),
  markDayMissed: (date?: string) =>
    update((d) => {
      const key = date ?? todayKey();
      d.logs[key] = { date: key, completedHours: 0, plannedHours: 0, missed: true };
    }),
  addStudiedHours: (h: number, planned: number) =>
    update((d) => {
      const key = todayKey();
      const log = d.logs[key] ?? { date: key, completedHours: 0, plannedHours: 0 };
      log.completedHours += h;
      log.plannedHours = planned;
      d.logs[key] = log;
    }),
  toggleRevisionDate: (date: string) =>
    update((d) => {
      const list = d.settings.revisionDates ?? [];
      d.settings.revisionDates = list.includes(date)
        ? list.filter((x) => x !== date)
        : [...list, date];
    }),
  reset: () => setState(() => seedState()),
};

let started = false;
function startClientSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  let loaded: AppState | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.version === 1) {
        const base = seedState();
        loaded = {
          ...parsed,
          settings: { ...base.settings, ...parsed.settings },
          dayPlans: parsed.dayPlans ?? {},
        };
      }
    }
  } catch {
    /* ignore */
  }
  setSnapshot({ state: loaded ?? snapshot.state, hydrated: true });
}

/* ------------------------------------------------------------------ */

export function StoreProvider({ children }: { children: ReactNode }) {
  const { state, hydrated } = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );

  useEffect(() => {
    startClientSync();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const apply = () => {
      const t = snapshot.state.settings.theme;
      const dark =
        t === "dark" ||
        (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [state.settings.theme]);

  return <>{children}</>;
}

export const useStore = (): Ctx => {
  const snap = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );
  return { state: snap.state, hydrated: snap.hydrated, ...actions };
};
