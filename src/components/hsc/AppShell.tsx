import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, BookOpen, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Today", icon: Home },
  { to: "/syllabus", label: "Syllabus", icon: BookOpen },
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-2xl px-5 pt-8">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-stretch justify-between px-4 py-2">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[11px] tracking-wide transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.6} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
