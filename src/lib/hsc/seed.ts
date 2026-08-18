import type { AppState, Chapter, Difficulty, Subject } from "./types";

type Seed = [string, Difficulty];

const mk = (prefix: string, paper: string, list: Seed[], startOrder: number): Chapter[] =>
  list.map(([name, difficulty], i) => ({
    id: `${prefix}-${startOrder + i}`,
    name,
    paper,
    difficulty,
    estimateOverride: null,
    actualHours: null,
    done: [],
    order: startOrder + i,
  }));

const physics1: Seed[] = [
  ["Physical World and Measurement", "short"],
  ["Vector", "average"],
  ["Dynamics", "hard"],
  ["Newtonian Mechanics", "hard"],
  ["Work, Energy and Power", "average"],
  ["Gravitation and Gravity", "average"],
  ["Structural Properties of Matter", "average"],
  ["Periodic Motion", "hard"],
  ["Waves", "hard"],
  ["Ideal Gas and Kinetic Theory of Gases", "average"],
];
const physics2: Seed[] = [
  ["Thermodynamics", "hard"],
  ["Static Electricity", "average"],
  ["Current Electricity", "average"],
  ["Magnetic Effects of Current and Magnetism", "hard"],
  ["Electromagnetic Induction and Alternating Current", "hard"],
  ["Geometrical Optics", "average"],
  ["Physical Optics", "average"],
  ["Introduction to Modern Physics", "hard"],
  ["Atomic Model and Nuclear Physics", "average"],
  ["Semiconductor and Electronics", "average"],
  ["Astrophysics", "short"],
];

const chem1: Seed[] = [
  ["Laboratory Safety and Basic Techniques", "short"],
  ["Qualitative Chemistry", "hard"],
  ["Periodic Properties and Chemical Bonding", "hard"],
  ["Chemical Changes", "hard"],
  ["Chemistry in Work and Industry", "average"],
];
const chem2: Seed[] = [
  ["Environmental Chemistry", "short"],
  ["Organic Chemistry", "hard"],
  ["Quantitative Chemistry", "hard"],
  ["Electrochemistry", "average"],
  ["Economic Chemistry", "average"],
];

const math1: Seed[] = [
  ["Matrices and Determinants", "average"],
  ["Vectors in Plane and Space", "average"],
  ["Straight Lines", "average"],
  ["Circle", "average"],
  ["Permutation and Combination", "hard"],
  ["Trigonometric Ratios of Associated Angles", "average"],
  ["Inverse Trigonometric Functions and Equations", "hard"],
  ["Functions and Graphs of Functions", "short"],
  ["Differentiation", "hard"],
  ["Integration", "hard"],
];
const math2: Seed[] = [
  ["Real Numbers and Inequalities", "short"],
  ["Complex Numbers", "average"],
  ["Polynomials and Polynomial Equations", "average"],
  ["Binomial Expansion", "average"],
  ["Conic Sections", "hard"],
  ["Inverse Trigonometric Functions and Trigonometric Equations", "hard"],
  ["Statics", "hard"],
  ["Dynamics (Motion in a Straight Line)", "hard"],
  ["Planar Vectors", "average"],
  ["Probability", "average"],
];

const bio1: Seed[] = [
  ["Cell and Cell Division", "hard"],
  ["Cell Chemistry", "average"],
  ["Cell Physiology (Enzymes)", "average"],
  ["Microorganisms", "average"],
  ["Algae and Fungi", "average"],
  ["Bryophyta and Pteridophyta", "short"],
  ["Gymnosperms and Angiosperms", "average"],
  ["Tissue and Tissue Systems", "average"],
  ["Plant Physiology", "hard"],
  ["Plant Reproduction", "average"],
  ["Biotechnology", "short"],
  ["Plant Ecology", "short"],
];
const bio2: Seed[] = [
  ["Animal Diversity and Classification", "average"],
  ["Introduction to Animals (Hydra, Grasshopper, Rui, Frog)", "average"],
  ["Human Physiology: Digestion and Absorption", "average"],
  ["Human Physiology: Blood and Circulation", "hard"],
  ["Human Physiology: Respiration", "average"],
  ["Human Physiology: Excretion", "average"],
  ["Human Physiology: Movement and Locomotion", "short"],
  ["Human Physiology: Coordination", "hard"],
  ["Human Reproduction and Embryology", "average"],
  ["Genetics and Evolution", "hard"],
  ["Animal Behaviour", "short"],
  ["Environment and Biodiversity Conservation", "short"],
];

const strategy = (labels: string[]) =>
  labels.map((label, i) => ({ id: `s${i + 1}`, label }));

export const seedSubjects = (): Subject[] => [
  {
    id: "physics",
    name: "Physics",
    short: "PHY",
    accent: "physics",
    enabled: true,
    strategy: strategy([
      "Watch class",
      "Read main book",
      "Derive formulas by hand",
      "Solve practice book",
      "Board question practice",
      "Revise",
    ]),
    chapters: [
      ...mk("phy", "1st Paper", physics1, 1),
      ...mk("phy", "2nd Paper", physics2, 11),
    ],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    short: "CHE",
    accent: "chemistry",
    enabled: true,
    strategy: strategy([
      "Watch class",
      "Read main book",
      "Memorise reactions",
      "Solve maths of the chapter",
      "Revise",
    ]),
    chapters: [
      ...mk("che", "1st Paper", chem1, 1),
      ...mk("che", "2nd Paper", chem2, 6),
    ],
  },
  {
    id: "math",
    name: "Higher Math",
    short: "MTH",
    accent: "math",
    enabled: true,
    strategy: strategy([
      "Watch class",
      "Learn formulas",
      "Solve examples",
      "Solve exercise",
      "Timed practice set",
      "Revise",
    ]),
    chapters: [
      ...mk("mth", "1st Paper", math1, 1),
      ...mk("mth", "2nd Paper", math2, 11),
    ],
  },
  {
    id: "biology",
    name: "Biology",
    short: "BIO",
    accent: "biology",
    enabled: true,
    strategy: strategy([
      "Watch class",
      "Read main book",
      "Make short notes",
      "Draw diagrams",
      "MCQ practice",
      "Revise",
    ]),
    chapters: [
      ...mk("bio", "1st Paper", bio1, 1),
      ...mk("bio", "2nd Paper", bio2, 13),
    ],
  },
];

export const seedState = (): AppState => ({
  version: 1,
  subjects: seedSubjects(),
  settings: {
    onboarded: false,
    mode: "hours",
    targetDate: null,
    hoursPerDay: 6,
    subjectsPerDay: 2,
    revisionWeekday: null,
    revisionDates: [],
    theme: "system",
  },
  logs: {},
  lastVisitedWeek: null,
});
