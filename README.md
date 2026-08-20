# HSC Study Planner

**Build an HSC Syllabus Tracker app** — a personal study planner for the **Bangladesh HSC syllabus** (Physics, Chemistry, Math, Biology).



**Core concept:**

The app pre-loads the standard **Bangladesh National Curriculum (NCTB) HSC syllabus** chapter list for all 4 subjects. Each subject has its own **study strategy** — a sequence of steps a chapter must go through to be "complete" (e.g. Watch Class → Solve Practice Book → Revise). Strategies are different per subject and fully editable. Each step is an individually completable task.



**Time-aware planning engine:**

- Every chapter has a **difficulty tag** — Hard / Average / Short — assigned based on typical Bangladesh HSC student difficulty for that topic, and editable by the user.

- Each difficulty level maps to a **default time-to-complete estimate**:

  - Hard chapter → 50 hours

  - Average chapter → 40 hours

  - Short/easy chapter → 30 hours

  - No difficulty tag → default to 6 hours (standard placeholder)

- Users can override any chapter's estimate manually.

- Once a chapter is finished, the app asks the user to log actual time: a quick **"took less / about right / took longer"** tap (or +/- hour stepper) — not manual number entry. This actual data adjusts future estimates and pace for that user over time.

- Two pacing modes, both time-aware:

  1. **Set a target date** → app sums total estimated hours for the syllabus, divides by days remaining, and shows the **required daily study hours** to hit that date.

  2. **Set daily/weekly study hours available** → app calculates a **realistic finish date** from total estimated hours ÷ available hours/day.

- If no time input is given, default to a standard 6 hours/day assumption.



**Feasibility check:**

- When target-date mode produces an unrealistic daily-hour requirement (e.g. "40 hrs/day"), show a **calm, non-alarming warning** (soft amber callout, not red/urgent) explaining it's not achievable, with a one-tap button to switch to the earliest realistic date instead. Never silently generate a broken plan.



**Rescheduling logic:**

- Task/chapter left **incomplete** at day's end → rolls into tomorrow's list.

- **"Missed a day" quick action** — one tap marks the whole day as unstudied, shows a preview of the reshuffle, then confirms. Reshuffles remaining hours across remaining days and recalculates the finish date (or required daily hours, if target-date mode is active).

- Everything remains manually editable — drag to reorder, reassign tasks/days, or edit any chapter's difficulty/time estimate/strategy at any time.



**Dashboard & home view:**

- Today's to-do list as the main screen — tasks grouped by subject, showing estimated hours planned for today, one-tap complete/skip with a satisfying check animation.

- Per-subject progress bars (Physics, Chemistry, Math, Biology) with % complete.

- Daily streak counter with a gentle celebratory moment on completing a full day's plan.

- A "today's realistic load" indicator comparing hours planned vs. hours the user typically has available, flagging overload before it happens.



**Syllabus/roadmap view (per subject):**

- Full chapter list with difficulty tag, estimated hours, logged actual hours (once studied), and status per strategy step.

- Timeline/calendar view showing which chapters land on which days across the whole plan.

- Manually reorder chapter priority or override any chapter's difficulty/time estimate.



**Premium UX details:**

- **Guided onboarding**: pick subjects → confirm/adjust chapter difficulty defaults → choose pacing method → instant feasibility check before finishing setup.

- **Micro-interactions**: animated progress bars, smooth check/strikethrough on completion, subtle haptic-style feedback.

- **Frictionless time logging**: tap-based "less/about right/longer" instead of typing numbers.

- **Typography-led, minimal design**: sparse color, strong hierarchy, subject color-coding used sparingly (icon or left-border accent per subject).

- **Dark/light mode**: system-aware by default, manual override, smooth transition (no flash).

- **Weekly summary**: hours studied vs. planned, streak, chapters completed, ahead/behind pace — shown at the start of each week.



**Technical:**

- Single user, no login/auth for now — local storage or simple backend state, but structure data (subjects, chapters, difficulty/time estimates, strategies, tasks, schedule, logged actual hours) so multi-user accounts could be added later without a rebuild.

- Seed data: Bangladesh NCTB HSC chapter lists for Physics, Chemistry, Math, Biology, with reasonable difficulty defaults pre-assigned (editable).

- Fully editable at every level: chapters, difficulty/time estimates, strategy steps, pacing, and daily schedule.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://study-buddy-hsc.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bcefbc0c-5156-41a3-8a61-3c0af0b41925).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
