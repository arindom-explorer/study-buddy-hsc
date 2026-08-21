import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/hsc/store";
import {
  computeFeasibility,
  prettyDate,
  addDays,
  todayKey,
  dayNumber,
  dayLabel,
} from "@/lib/hsc/planner";
import { hrs } from "./ui-bits";

export function MissedDayDialog() {
  const { state, markDayMissed } = useStore();
  const [open, setOpen] = useState(false);
  const before = computeFeasibility(state);

  // Losing today shifts everything one day: same hours, one fewer day.
  const after =
    before.mode === "target"
      ? {
          label: "Required daily hours",
          from: hrs(before.requiredDaily),
          to: hrs(before.remainingHours / Math.max(1, before.daysLeft - 1)),
        }
      : {
          label: "Finish date",
          from: prettyDate(before.finishDate),
          to: prettyDate(addDays(before.finishDate, 1)),
        };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-4">
          Skip today
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Reshuffle the plan</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Marking {prettyDate(todayKey())} as unstudied. You stay on{" "}
          {dayLabel(dayNumber(state))} — tomorrow picks up the same plan, and the remaining{" "}
          {hrs(before.remainingHours)} shift one day later.
        </p>
        <div className="mt-2 rounded-xl border border-border p-4 text-sm">
          <p className="text-muted-foreground">{after.label}</p>
          <p className="mt-1 text-lg">
            {after.from} <span className="text-muted-foreground">→</span> {after.to}
          </p>
        </div>
        <div className="mt-2 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              markDayMissed();
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
