import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { seedState } from "./seed";
import { chapterEstimate, todayKey } from "./planner";
import type { AppState, Difficulty, Settings, Subject } from "./types";

const KEY = "hsc-tracker-v1";

type Ctx = {
  state: AppState;
  hydrated: boolean;
  update: (fn: (draft: AppState) => void) => void;
  toggleStep: (subjectId: string, chapterId: string, stepId: string) => void;
  setDifficulty: (subjectId: string, chapterId: string, d: Difficulty) => void;
  setEstimate: (subjectId: string, chapterId: string, hours: number | null) => void;
  logActual: (subjectId: string, chapterId: string, kind: "less" | "right" | "longer" | number) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setStrategy: (subjectId: string, steps: Subject["strategy"]) => void;
  moveChapter: (subjectId: string, chapterId: string, dir: -1 | 1) => void;
  markDayMissed: (date?: string) => void;
  addStudiedHours: (h: number, planned: number) => void;
  toggleRevisionDate: (date: string) => void;
  reset: () => void;
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/* ------------------------------------------------------------------ */
/* Module-level singleton store (no React context required)            */
/* ------------------------------------------------------------------ */

type Snapshot = { state: AppState; hydrated: boolean };

const serverSnapshot: Snapshot = { state: seedState(), hydrated: false };
let snapshot: Snapshot = serverSnapshot;

const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const emit = () => listeners.forEach((l) => l());

const setSnapshot = (next: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...next };
  emit();
};

const setState = (fn: (prev: AppState) => AppState) =>
  setSnapshot({ state: fn(snapshot.state) });

const update = (fn: (draft: AppState) => void) =>
  setState((prev) => {
    const next = clone(prev);
    fn(next);
    return next;
  });

const findChapter = (draft: AppState, subjectId: string, chapterId: string) => {
  const s = draft.subjects.find((x) => x.id === subjectId);
  const c = s?.chapters.find((x) => x.id === chapterId);
  return { s, c };
};

const actions = {
  update,
  toggleStep: (subjectId: string, chapterId: string, stepId: string) =>
    update((d) => {
      const { s, c } = findChapter(d, subjectId, chapterId);
      if (!s || !c) return;
      const has = c.done.includes(stepId);
      const hours = chapterEstimate(c) / Math.max(1, s.strategy.length);
      c.done = has ? c.done.filter((x) => x !== stepId) : [...c.done, stepId];
      const key = todayKey();
      const log = d.logs[key] ?? { date: key, completedHours: 0, plannedHours: 0 };
      log.completedHours = Math.max(0, log.completedHours + (has ? -hours : hours));
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
        loaded = { ...parsed, settings: { ...base.settings, ...parsed.settings } };
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
