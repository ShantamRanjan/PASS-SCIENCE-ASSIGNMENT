import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Box, Flame, Gauge, Network, Plus, RefreshCw, Thermometer, Upload } from "lucide-react";
import { DemoBadge, Panel, PageHeader, StatusDot, Btn } from "@/components/nexus/primitives";
import { ExperimentTable } from "@/components/nexus/ExperimentTable";
import { DEMO_EXPERIMENTS } from "@/lib/demo-data";
import { useBackend } from "@/hooks/use-backend";
import { APP_VERSION, BACKEND_URL } from "@/services/api";
import { pageMeta } from "@/lib/meta";
import { systemInformation } from "@/lib/system-information";

export const Route = createFileRoute("/")({
  head: () => pageMeta("Overview", "NEXUS workstation overview: modules, recent experiments and engine status."),
  component: Overview,
});

const MODULES = [
  { to: "/thermal", icon: Flame, title: "Thermal Analysis", desc: "1D FEM steady-state conduction with heat generation", tag: "FEM" },
  { to: "/performance", icon: Gauge, title: "Performance Lab", desc: "Serial vs. parallel solver benchmarking", tag: "HPC" },
  { to: "/geometry", icon: Box, title: "Geometry Workbench", desc: "STL inspection and temperature point clouds", tag: "CAD" },
  { to: "/neural", icon: Network, title: "Neural Network Lab", desc: "Forward pass, loss and gradient verification", tag: "ML" },
] as const;

function Overview() {
  const { state, info, message, lastChecked, check } = useBackend();
  const system = systemInformation(state === "connected" ? info : null);
  const actionCls = "grid min-h-10 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-sm border border-input bg-secondary/40 px-3 py-2 text-xs font-medium transition-colors hover:border-primary/60 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px]">
      <PageHeader title="Welcome to NEXUS" subtitle="Engineering simulation workstation · native C++17 compute engine" />

      <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="group flex min-w-0 flex-col rounded-sm border border-border bg-panel p-4 transition-colors hover:border-primary/60">
            <div className="flex items-center justify-between">
              <m.icon className="h-5 w-5 shrink-0 text-primary" />
              <span className="font-mono text-[10px] text-muted-foreground">{m.tag}</span>
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm font-medium">
              <span>{m.title}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
            </div>
            <p className="mb-4 mt-1.5 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
            <div className="mt-auto flex items-center gap-2 border-t border-border pt-2.5 font-mono text-[10px] text-muted-foreground">
              <StatusDot state={state} />
              {state === "connected" ? "Ready" : state === "connecting" ? "Checking engine" : state === "error" ? "Engine error" : "Awaiting engine"}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.46fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Recent experiments" actions={<DemoBadge />} bodyClassName="p-0">
            <ExperimentTable rows={DEMO_EXPERIMENTS.slice(0, 5)} />
          </Panel>
          <Panel title="Quick actions">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link to="/thermal" className={actionCls}><Plus className="h-4 w-4 text-primary" /><span>New Thermal Simulation</span><ArrowUpRight className="h-3 w-3 text-muted-foreground" /></Link>
              <Link to="/geometry" search={{ import: "stl" }} className={actionCls}><Upload className="h-4 w-4 text-primary" /><span>Import STL Model</span><ArrowUpRight className="h-3 w-3 text-muted-foreground" /></Link>
              <Link to="/geometry" search={{ import: "csv" }} className={actionCls}><Thermometer className="h-4 w-4 text-primary" /><span>Import Temperature CSV</span><ArrowUpRight className="h-3 w-3 text-muted-foreground" /></Link>
              <Link to="/performance" className={actionCls}><Gauge className="h-4 w-4 text-primary" /><span>Run Performance Benchmark</span><ArrowUpRight className="h-3 w-3 text-muted-foreground" /></Link>
            </div>
            <div className="mt-3 border-t border-border pt-2.5">
              <Link to="/hardware" className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary">Scan devices<ArrowUpRight className="h-3 w-3" /></Link>
            </div>
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Backend status">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2"><StatusDot state={state} /><span role="status" className="font-mono text-xs font-medium uppercase">{state}</span></div>
              <Btn onClick={() => void check()} disabled={state === "connecting"} aria-label="Retry health check"><RefreshCw className={state === "connecting" ? "animate-spin motion-reduce:animate-none" : ""} />{state === "connecting" ? "Checking" : "Retry"}</Btn>
            </div>
            <p className="mt-3 break-words text-xs leading-relaxed text-muted-foreground">
              {state === "connected" ? `nexus-core ${info?.version} · Health check confirmed` : state === "connecting" ? "Waiting for engine confirmation…" : message ?? "Engine health has not been confirmed."}
            </p>
            <dl className="mt-3 space-y-2 border-t border-border pt-3 text-[11px]">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">Endpoint</dt><dd className="break-all text-right font-mono">{BACKEND_URL}</dd></div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">Last health check</dt><dd className="text-right font-mono">{lastChecked ? lastChecked.toLocaleTimeString() : "N/A"}</dd></div>
            </dl>
          </Panel>
          <Panel title="System information" bodyClassName="p-0">
            <dl className="divide-y divide-border/60 text-[11px]">
              {[
                ["Frontend version", `v${APP_VERSION}`],
                ["Backend version", system.version],
                ["Operating system", system.operatingSystem],
                ["CPU", system.cpu],
                ["Available workers", system.workers],
                ["Compiler", system.compiler],
                ["Shell", "Tauri 2 (pending)"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 px-3 py-2">
                  <dt className="text-muted-foreground">{k}</dt><dd className="break-words text-right font-mono">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
