export type Difficulty = "hard" | "average" | "short" | "none";

export const DIFFICULTY_HOURS: Record<Difficulty, number> = {
  hard: 50,
  average: 40,
  short: 30,
  none: 6,
};

export const DEFAULT_DAILY_HOURS = 6;

export type StrategyStep = {
  id: string;
  label: string;
  /** default number of individually trackable units for this step (1 = single task) */
  count?: number;
};

export type Chapter = {
  id: string;
  name: string;
  paper: string;
  difficulty: Difficulty;
  /** number of classes for this chapter; if set, estimate = classes * 1.5 hours */
  classes: number | null;
  /** manual override of estimated hours; null = derive from difficulty or classes */
  estimateOverride: number | null;
  /** logged actual hours once the chapter is finished */
  actualHours: number | null;
  /** completed unit ids: `stepId` (whole step) or `stepId#i` (single unit) */
  done: string[];
  /** per-chapter override of a strategy step's unit count */
  counts?: Record<string, number>;
  order: number;
};

export type Subject = {
  id: string;
  name: string;
  short: string;
  accent: string; // css variable name suffix, e.g. "physics"
  enabled: boolean;
  strategy: StrategyStep[];
  chapters: Chapter[];
};

export type PacingMode = "target" | "hours";

export type Settings = {
  onboarded: boolean;
  mode: PacingMode;
  targetDate: string | null; // ISO yyyy-mm-dd
  hoursPerDay: number;
  /** how many different subjects to study each day */
  subjectsPerDay: number;
  /** optional weekly revision day (0 = Sunday ... 6 = Saturday); null = none */
  revisionWeekday: number | null;
  /** extra one-off revision dates (yyyy-mm-dd) */
  revisionDates: string[];
  theme: "system" | "light" | "dark";
};

export type DayLog = {
  date: string; // yyyy-mm-dd
  completedHours: number;
  plannedHours: number;
  missed?: boolean;
};

/** A single scheduled unit of work on a given day. */
export type PlannedTask = {
  /** stable identity of the work unit: subjectId:chapterId:unitKey */
  key: string;
  /** unique per scheduled slot (a unit may be split across days) */
  id: string;
  subjectId: string;
  subjectName: string;
  accent: string;
  chapterId: string;
  chapterName: string;
  stepId: string;
  stepLabel: string;
  /** `stepId` or `stepId#i` */
  unitKey: string;
  unitIndex: number;
  unitCount: number;
  hours: number;
  /** true when the task was pulled in early by "study ahead" */
  pulled?: boolean;
};

export type AppState = {
  version: number;
  subjects: Subject[];
  settings: Settings;
  logs: Record<string, DayLog>;
  /** frozen day plans keyed by date — today's list never re-shuffles under you */
  dayPlans: Record<string, PlannedTask[]>;
  /** ordered ids of chapters manually pinned/reordered globally */
  lastVisitedWeek: string | null;
};
