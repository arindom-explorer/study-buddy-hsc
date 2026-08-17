import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/hsc/AppShell";
import { ProgressBar } from "@/components/hsc/ui-bits";
import { useStore } from "@/lib/hsc/store";
import { isChapterDone, subjectProgress } from "@/lib/hsc/planner";

export const Route = createFileRoute("/syllabus/")({
  head: () => ({
    meta: [
      { title: "Syllabus — HSC Syllabus Tracker" },
      {
        name: "description",
        content:
          "Browse the NCTB HSC chapter list for Physics, Chemistry, Higher Math and Biology with difficulty and hours.",
      },
      { property: "og:title", content: "Syllabus — HSC Syllabus Tracker" },
      {
        property: "og:description",
        content: "Full NCTB HSC chapter roadmap with editable difficulty and time estimates.",
      },
    ],
  }),
  component: SyllabusIndex,
});

function SyllabusIndex() {
  const { state } = useStore();
  return (
    <AppShell>
      <h1 className="font-display text-4xl">Syllabus</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        NCTB HSC chapters, editable at every level.
      </p>
      <div className="mt-8 space-y-3">
        {state.subjects.map((s) => (
          <Link
            key={s.id}
            to="/syllabus/$subjectId"
            params={{ subjectId: s.id }}
            className="block rounded-xl border border-border bg-card p-4"
            style={{ borderLeft: `3px solid var(--${s.accent})` }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">
                {s.chapters.filter((c) => isChapterDone(c, s)).length}/{s.chapters.length} done
              </span>
            </div>
            <ProgressBar className="mt-3" value={subjectProgress(s)} accent={s.accent} />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
