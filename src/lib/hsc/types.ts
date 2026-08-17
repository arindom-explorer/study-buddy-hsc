export type Difficulty = "hard" | "average" | "short" | "none";

export const DIFFICULTY_HOURS: Record<Difficulty, number> = {
  hard: 50,
  average: 40,
  short: 30,
  none: 6,
};

export const DEFAULT_DAILY_HOURS = 6;

export type StrategyStep = { id: string; label: string };

export type Chapter = {
  id: string;
  name: string;
  paper: string;
  difficulty: Difficulty;
  /** manual override of estimated hours; null = derive from difficulty */
  estimateOverride: number | null;
  /** logged actual hours once the chapter is finished */
  actualHours: number | null;
  /** completed strategy step ids */
  done: string[];
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
  theme: "system" | "light" | "dark";
};

export type DayLog = {
  date: string; // yyyy-mm-dd
  completedHours: number;
  plannedHours: number;
  missed?: boolean;
};

export type AppState = {
  version: number;
  subjects: Subject[];
  settings: Settings;
  logs: Record<string, DayLog>;
  /** ordered ids of chapters manually pinned/reordered globally */
  lastVisitedWeek: string | null;
};
