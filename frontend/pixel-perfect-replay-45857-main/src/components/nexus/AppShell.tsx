import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsLeft, ChevronsRight, Hexagon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { Btn, StatusDot } from "./primitives";
import { useBackend } from "@/hooks/use-backend";
import { APP_VERSION } from "@/services/api";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to))) ?? NAV[0];
  const { state, check } = useBackend();

  return (
    <div className="flex h-dvh w-full min-w-0 flex-col overflow-hidden">
      <header className="grid h-10 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b border-border bg-panel-header">
        <div className={cn("flex h-full shrink-0 items-center gap-2 border-r border-border px-3", collapsed ? "w-12" : "w-12 lg:w-56")}>
          <Hexagon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
          {!collapsed && (
            <span className="hidden whitespace-nowrap font-mono text-sm font-bold lg:inline">
              NEXUS<span className="ml-1.5 text-[10px] font-normal tracking-normal text-muted-foreground">Engineering Sim</span>
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2 px-3 text-xs sm:px-4">
          <span className="hidden font-mono text-muted-foreground sm:inline">{current?.code}</span>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <span className="truncate font-medium">{current?.label ?? "NEXUS"}</span>
        </div>
        <div className="flex h-full items-center divide-x divide-border border-l border-border text-[11px]">
          <Btn variant="ghost" onClick={() => void check()} disabled={state === "connecting"} className="h-full gap-2 rounded-none px-2 text-[11px] sm:px-3" title="Retry connection" aria-label="Retry engine connection">
            <StatusDot state={state} />
            <span className="font-mono uppercase">
              <span className="hidden sm:inline">Engine: </span>{state}
            </span>
            <RefreshCw className={cn("h-3 w-3 text-muted-foreground", state === "connecting" && "animate-spin")} />
          </Btn>
          <span className="hidden px-3 font-mono text-muted-foreground md:inline">v{APP_VERSION}</span>
          <span className="hidden px-3 font-mono text-muted-foreground xl:inline">Theme: Navy Dark</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
         <nav aria-label="Modules" className={cn("flex min-h-0 shrink-0 flex-col border-r border-border bg-panel", collapsed ? "w-12" : "w-12 lg:w-56")}>
          <div className="px-3 pb-1 pt-3">{!collapsed && <span className="label-caps hidden lg:inline">Modules</span>}</div>
          <ul className="min-h-0 flex-1 space-y-px overflow-y-auto px-1.5">
            {NAV.map((n) => {
               const active = n.to === current?.to;
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    title={n.label}
                    className={cn(
                      "flex h-8 items-center gap-2.5 rounded-sm border-l-2 px-2 text-xs transition-colors",
                      active
                        ? "border-l-primary bg-accent text-foreground"
                        : "border-l-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <n.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                    {!collapsed && <span className="hidden truncate lg:inline">{n.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Btn variant="ghost"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-8 shrink-0 items-center justify-center rounded-none border-t border-border text-muted-foreground hover:text-foreground lg:flex"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </Btn>
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">{children}</main>
      </div>

      <footer className="grid h-6 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border bg-panel-header px-3 font-mono text-[10px] text-muted-foreground">
        <span className="truncate">nexus-core.exe · C++17 · IPC 127.0.0.1:7878</span>
        <span>{state === "connected" ? "Engine ready" : "Engine " + state}</span>
      </footer>
    </div>
  );
}
