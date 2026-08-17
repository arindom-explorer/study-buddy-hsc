import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { AppShell } from "@/components/hsc/AppShell";
import { DifficultyChip, ProgressBar, hrs } from "@/components/hsc/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useStore } from "@/lib/hsc/store";
import { chapterEstimate, chapterProgress, subjectProgress } from "@/lib/hsc/planner";
import type { Difficulty } from "@/lib/hsc/types";
import { cn } from "@/lib/utils";
import { TimeLogSheet } from "@/components/hsc/TimeLogSheet";

export const Route = createFileRoute("/syllabus/$subjectId")({
  head: ({ params }) => {
    const name = params.subjectId.charAt(0).toUpperCase() + params.subjectId.slice(1);
    return {
      meta: [
        { title: `${name} roadmap — HSC Syllabus Tracker` },
        {
          name: "description",
          content: `Chapter-by-chapter ${name} roadmap with difficulty tags, hour estimates and study strategy steps.`,
        },
        { property: "og:title", content: `${name} roadmap — HSC Syllabus Tracker` },
        {
          property: "og:description",
          content: `Track every ${name} chapter through your study strategy.`,
        },
      ],
    };
  },
  component: SubjectPage,
});

const diffs: Difficulty[] = ["hard", "average", "short", "none"];

function SubjectPage() {
  const { subjectId } = Route.useParams();
  const { state, hydrated, toggleStep, setDifficulty, setEstimate, moveChapter, setStrategy } =
    useStore();
  const [logTarget, setLogTarget] = useState<{ subjectId: string; chapterId: string } | null>(null);
  const [newStep, setNewStep] = useState("");

  const subject = state.subjects.find((s) => s.id === subjectId);
  if (!hydrated) return <AppShell>{null}</AppShell>;
  if (!subject) throw notFound();

  const chapters = [...subject.chapters].sort((a, b) => a.order - b.order);

  return (
    <AppShell>
      <Link to="/syllabus" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Syllabus
      </Link>
      <h1 className="mt-3 font-display text-4xl">{subject.name}</h1>
      <ProgressBar className="mt-4" value={subjectProgress(subject)} accent={subject.accent} />

      <section className="mt-8 rounded-xl border border-border p-4">
        <h2 className="font-display text-xl">Study strategy</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Every chapter passes through these steps.
        </p>
        <ul className="mt-3 space-y-1.5">
          {subject.strategy.map((st, i) => (
            <li key={st.id} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-muted-foreground">{i + 1}</span>
              <Input
                className="h-9 flex-1"
                value={st.label}
                onChange={(e) =>
                  setStrategy(
                    subject.id,
                    subject.strategy.map((x) =>
                      x.id === st.id ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove step"
                onClick={() =>
                  setStrategy(
                    subject.id,
                    subject.strategy.filter((x) => x.id !== st.id),
                  )
                }
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Input
            className="h-9"
            placeholder="Add a step"
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
          />
          <Button
            size="icon"
            variant="outline"
            aria-label="Add step"
            onClick={() => {
              if (!newStep.trim()) return;
              setStrategy(subject.id, [
                ...subject.strategy,
                { id: `s${Date.now()}`, label: newStep.trim() },
              ]);
              setNewStep("");
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </section>

      <section className="mt-8 space-y-2">
        {chapters.map((c, idx) => (
          <Collapsible key={c.id} className="rounded-xl border border-border bg-card">
            <div className="flex items-start gap-2 p-3.5">
              <CollapsibleTrigger className="min-w-0 flex-1 text-left">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {c.paper}
                </p>
                <p className="mt-0.5 text-sm font-medium">{c.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <DifficultyChip d={c.difficulty} />
                  <span className="text-xs text-muted-foreground">
                    est {hrs(chapterEstimate(c))}
                    {c.actualHours != null ? ` · actual ${hrs(c.actualHours)}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.done.length}/{subject.strategy.length} steps
                  </span>
                </div>
                <ProgressBar
                  className="mt-2"
                  value={chapterProgress(c, subject)}
                  accent={subject.accent}
                />
              </CollapsibleTrigger>
              <div className="flex flex-col">
                <button
                  aria-label="Move up"
                  disabled={idx === 0}
                  className="text-muted-foreground disabled:opacity-30"
                  onClick={() => moveChapter(subject.id, c.id, -1)}
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  aria-label="Move down"
                  disabled={idx === chapters.length - 1}
                  className="text-muted-foreground disabled:opacity-30"
                  onClick={() => moveChapter(subject.id, c.id, 1)}
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>

            <CollapsibleContent className="border-t border-border px-3.5 pb-4 pt-3">
              <div className="space-y-1.5">
                {subject.strategy.map((st) => {
                  const done = c.done.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      onClick={() => {
                        toggleStep(subject.id, c.id, st.id);
                        if (!done && c.done.length + 1 >= subject.strategy.length)
                          setLogTarget({ subjectId: subject.id, chapterId: c.id });
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <span
                        className={cn(
                          "size-4 shrink-0 rounded-full border border-border transition-colors",
                          done && "bg-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "transition-all",
                          done && "text-muted-foreground line-through",
                        )}
                      >
                        {st.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {diffs.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(subject.id, c.id, d)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                      c.difficulty === d
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {d === "none" ? "Untagged" : d[0]!.toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>

              <label className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                Override estimate (h)
                <Input
                  type="number"
                  min={1}
                  className="h-9 w-24"
                  value={c.estimateOverride ?? ""}
                  placeholder={String(chapterEstimate(c))}
                  onChange={(e) =>
                    setEstimate(subject.id, c.id, e.target.value ? Number(e.target.value) : null)
                  }
                />
              </label>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </section>

      <TimeLogSheet target={logTarget} onClose={() => setLogTarget(null)} />
    </AppShell>
  );
}
