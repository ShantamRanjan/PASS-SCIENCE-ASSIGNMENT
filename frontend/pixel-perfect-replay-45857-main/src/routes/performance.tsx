import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import { BackendGuardNote, Btn, DemoBadge, Field, inputCls, Metric, PageHeader, Panel, StateView } from "@/components/nexus/primitives";
import { NBarChart, NLineChart } from "@/components/nexus/charts";
import { DEMO_BENCH } from "@/lib/demo-data";
import { useBackend } from "@/hooks/use-backend";
import { api } from "@/services/api";
import type { BenchmarkParams, BenchmarkResult } from "@/types/api";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/performance")({
  head: () => pageMeta("Performance Lab", "Benchmark serial versus parallel solver execution, speedup and efficiency."),
  component: Performance,
});

function Performance() {
  const { state } = useBackend();
  const [p, setP] = useState<BenchmarkParams>({ workers: 4, cases: 64, meshSize: 80 });
  const [r, setR] = useState<BenchmarkResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [err, setErr] = useState<string>();

  async function run() {
    setStatus("loading");
    const res = await api.performance.run(p);
    if (res.ok) {
      setR(res.data);
      setStatus("idle");
    } else {
      setErr(res.error.message);
      setStatus("error");
    }
  }

  const chart = r ? r.perWorker.map((w) => ({ workers: w.workers, time: w.timeMs, speedup: w.speedup, ideal: w.workers })) : DEMO_BENCH.map((d) => ({ ...d, ideal: d.workers }));

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Performance Lab" subtitle="Thread-pool benchmarking of the native solver" />
      <BackendGuardNote />
      <div className="grid grid-cols-[280px_1fr] gap-3">
        <Panel title="Benchmark configuration">
          <div className="space-y-3">
            <Field label="Worker count">
              <div className="grid grid-cols-4 gap-1">
                {([1, 2, 3, 4] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setP({ ...p, workers: w })}
                    className={cn("h-7 rounded-sm border font-mono text-xs", p.workers === w ? "border-primary bg-primary/15 text-primary" : "border-input text-muted-foreground hover:bg-secondary")}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Benchmark cases">
              <input type="number" min={1} className={inputCls} value={p.cases} onChange={(e) => setP({ ...p, cases: Number(e.target.value) })} />
            </Field>
            <Field label="Mesh size" unit="elements">
              <input type="number" min={2} className={inputCls} value={p.meshSize} onChange={(e) => setP({ ...p, meshSize: Number(e.target.value) })} />
            </Field>
            <Btn variant="primary" className="w-full" onClick={run} disabled={state !== "connected" || status === "loading"}>
              <Play /> {status === "loading" ? "Running…" : "Run benchmark"}
            </Btn>
            {status === "error" && <p className="text-[11px] text-destructive">{err}</p>}
          </div>
        </Panel>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Panel title="Serial execution">
              {status === "loading" ? <StateView state="loading" /> : (
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Execution time" value={r ? r.serialMs.toFixed(1) : "—"} unit="ms" />
                  <Metric label="Threads" value={1} />
                </div>
              )}
            </Panel>
            <Panel title={`Parallel execution · ${p.workers} workers`}>
              {status === "loading" ? <StateView state="loading" /> : (
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Execution time" value={r ? r.parallelMs.toFixed(1) : "—"} unit="ms" />
                  <Metric label="Speedup" value={r ? r.speedup.toFixed(2) : "—"} unit="×" />
                  <Metric label="Efficiency" value={r ? (r.efficiency * 100).toFixed(1) : "—"} unit="%" />
                </div>
              )}
            </Panel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Panel title="Execution time vs workers" actions={!r && <DemoBadge />}>
              <NBarChart data={chart} x="workers" height={240} series={[{ key: "time", name: "Time [ms]", color: "var(--chart-1)" }]} />
            </Panel>
            <Panel title="Speedup vs ideal" actions={!r && <DemoBadge />}>
              <NLineChart
                data={chart}
                x="workers"
                height={240}
                series={[
                  { key: "ideal", name: "Ideal (linear)", color: "var(--muted-foreground)", dashed: true },
                  { key: "speedup", name: "Measured", color: "var(--chart-2)" },
                ]}
              />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
