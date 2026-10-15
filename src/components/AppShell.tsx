import { Link, useRouterState } from "@tanstack/react-router";
import {
  Brain,
  Camera,
  Gamepad2,
  HeartHandshake,
  LayoutDashboard,
  Home,
  Network,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCare } from "@/lib/care-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/companion", label: "Companion", icon: HeartHandshake },
  { to: "/perception", label: "Perception", icon: Camera },
  { to: "/therapy", label: "Therapies", icon: Gamepad2 },
  { to: "/memory", label: "Memory Engine", icon: Network },
  { to: "/caregiver", label: "Caregiver", icon: LayoutDashboard },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useCare();
  const open = state.alerts.filter((a) => !a.resolved).length;
  const patientView = path === "/companion";
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {!patientView && (
        <aside className="bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 flex md:flex-col">
          <div className="hidden md:flex items-center gap-3 px-6 py-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg leading-tight">CareCompanion</div>
              <div className="text-xs opacity-60">Memory-augmented AI</div>
            </div>
          </div>
          <nav className="flex flex-1 md:flex-col gap-1 overflow-x-auto px-2 py-2 md:px-3">
            {NAV.map((n) => {
              const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "opacity-75 hover:opacity-100 hover:bg-sidebar-accent/60",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                  {n.to === "/caregiver" && open > 0 && (
                    <span className="ml-auto rounded-full bg-destructive px-2 text-xs text-destructive-foreground">
                      {open}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="hidden md:block border-t border-sidebar-border px-6 py-4 text-xs opacity-60">
            Research prototype · not a medical device
          </div>
        </aside>
      )}
      <main className={cn("flex-1 min-w-0", patientView && "min-h-screen")}>{children}</main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-6 md:px-10">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">
          {eyebrow}
        </div>
        <h1 className="mt-1 text-3xl md:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}
