import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/hsc/store";
import { chapterEstimate } from "@/lib/hsc/planner";
import { hrs } from "./ui-bits";
import { Minus, Plus } from "lucide-react";

export function TimeLogSheet({
  target,
  onClose,
}: {
  target: { subjectId: string; chapterId: string } | null;
  onClose: () => void;
}) {
  const { state, logActual } = useStore();
  const subject = state.subjects.find((s) => s.id === target?.subjectId);
  const chapter = subject?.chapters.find((c) => c.id === target?.chapterId);
  const open = Boolean(target && chapter);
  const estimate = chapter ? chapterEstimate(chapter) : 0;
  const actual = chapter?.actualHours ?? estimate;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {chapter?.name} finished
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          We estimated {hrs(estimate)}. How did it actually go? This quietly tunes your future
          estimates.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["less", "right", "longer"] as const).map((k) => (
            <Button
              key={k}
              variant="outline"
              className="h-16 flex-col gap-1 text-xs"
              onClick={() => target && logActual(target.subjectId, target.chapterId, k)}
            >
              <span className="text-sm font-medium">
                {k === "less" ? "Took less" : k === "right" ? "About right" : "Took longer"}
              </span>
            </Button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-border p-3">
          <span className="text-sm text-muted-foreground">Logged</span>
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Less hours"
              onClick={() => target && logActual(target.subjectId, target.chapterId, -1)}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-14 text-center text-lg">{hrs(actual)}</span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="More hours"
              onClick={() => target && logActual(target.subjectId, target.chapterId, 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <Button className="mt-2 h-11" onClick={onClose}>
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
