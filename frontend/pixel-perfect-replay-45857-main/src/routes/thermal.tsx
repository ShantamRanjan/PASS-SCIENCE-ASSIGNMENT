import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Play } from "lucide-react";
import { BackendGuardNote, Btn, DemoBadge, Field, inputCls, Metric, PageHeader, Panel, StateView } from "@/components/nexus/primitives";
import { NLineChart } from "@/components/nexus/charts";
import { DEMO_CONVERGENCE, DEMO_THERMAL } from "@/lib/demo-data";
import { useBackend } from "@/hooks/use-backend";
import { api } from "@/services/api";
import type { ThermalParams, ThermalResult } from "@/types/api";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/thermal")({
  head: () => pageMeta("Thermal Analysis", "1D finite-element steady-state heat conduction with analytical comparison."),
  component: Thermal,
});

const MESHES = [10, 20, 40, 80] as const;

function Thermal() {
  const { state } = useBackend();
  const [p, setP] = useState<ThermalParams>({ length: 1, area: 0.01, conductivity: 45, heatGeneration: 5000, tLeft: 100, tRight: 100, elements: 20 });
  const [result, setResult] = useState<ThermalResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [err, setErr] = useState<string>();

  const fields: { k: keyof Omit<ThermalParams, "elements">; label: string; unit: string }[] = [
    { k: "length", label: "Length", unit: "m" },
    { k: "area", label: "Cross-section area", unit: "m²" },
    { k: "conductivity", label: "Thermal conductivity", unit: "W/m·K" },
    { k: "heatGeneration", label: "Heat generation", unit: "W/m³" },
    { k: "tLeft", label: "Left boundary T", unit: "°C" },
    { k: "tRight", label: "Right boundary T", unit: "°C" },
  ];

  async function solve() {
    setStatus("loading");
    const r = await api.thermal.solve(p);
    if (r.ok) {
      setResult(r.data);
      setStatus("idle");
    } else {
      setErr(r.error.message);
      setStatus("error");
    }
  }

  function exportCsv() {
    if (!result) return;
    const csv = ["x,numerical,analytical", ...result.nodes.map((n) => `${n.x},${n.numerical},${n.analytical}`)].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `thermal_n${p.elements}.csv`;
    a.click();
  }

  const live = !!result;
  const tempData = live ? result.nodes : DEMO_THERMAL;
  const convData = live ? result.convergence.map((c) => ({ elements: c.elements, error: c.maxAbsError })) : DEMO_CONVERGENCE;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Thermal Analysis"
        subtitle="1D steady-state conduction · linear finite elements · −kA d²T/dx² = qA"
        actions={
          <Btn onClick={exportCsv} disabled={!live}>
            <Download /> Export CSV
          </Btn>
        }
      />
      <BackendGuardNote />
      <div className="grid grid-cols-[280px_1fr] gap-3">
        <div className="flex flex-col gap-3">
          <Panel title="Parameters">
            <div className="space-y-2.5">
              {fields.map((f) => (
                <Field key={f.k} label={f.label} unit={f.unit}>
                  <input
                    type="number"
                    className={inputCls}
                    value={p[f.k]}
                    onChange={(e) => setP({ ...p, [f.k]: Number(e.target.value) })}
                  />
                </Field>
              ))}
            </div>
          </Panel>
          <Panel title="Mesh">
            <div className="grid grid-cols-4 gap-1">
              {MESHES.map((m) => (
                <button
                  key={m}
                  onClick={() => setP({ ...p, elements: m })}
                  className={cn(
                    "h-7 rounded-sm border font-mono text-xs",
                    p.elements === m ? "border-primary bg-primary/15 text-primary" : "border-input text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">Elements · {p.elements + 1} nodes</p>
            <Btn variant="primary" className="mt-3 w-full" onClick={solve} disabled={state !== "connected" || status === "loading"}>
              <Play /> {status === "loading" ? "Solving…" : "Run solver"}
            </Btn>
            {status === "error" && <p className="mt-2 text-[11px] text-destructive">{err}</p>}
          </Panel>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-3">
            <Metric label="Max abs. error" value={live ? result.maxAbsError.toExponential(3) : "—"} unit="°C" />
            <Metric label="Elements" value={p.elements} />
            <Metric label="Solve time" value={live ? result.solveTimeMs.toFixed(2) : "—"} unit="ms" />
            <Metric label="Peak T" value={live ? Math.max(...result.nodes.map((n) => n.numerical)).toFixed(2) : "—"} unit="°C" />
          </div>
          <Panel title="Temperature distribution · analytical vs numerical" actions={!live && <DemoBadge />}>
            {status === "loading" ? (
              <StateView state="loading" />
            ) : (
              <NLineChart
                data={tempData as unknown as Record<string, number>[]}
                x="x"
                height={260}
                series={[
                  { key: "analytical", name: "Analytical", color: "var(--chart-2)", dashed: true },
                  { key: "numerical", name: "FEM numerical", color: "var(--chart-1)" },
                ]}
              />
            )}
          </Panel>
          <div className="grid grid-cols-2 gap-3">
            <Panel title="Mesh convergence · max |error|" actions={!live && <DemoBadge />}>
              <NLineChart data={convData} x="elements" height={180} logY series={[{ key: "error", name: "Max |error|", color: "var(--chart-3)" }]} />
            </Panel>
            <Panel title="Nodal comparison" actions={!live && <DemoBadge />} bodyClassName="p-0 max-h-[220px] overflow-auto">
              <table className="w-full font-mono text-[11px]">
                <thead className="sticky top-0 bg-panel-header">
                  <tr className="text-left">
                    {["x [m]", "FEM [°C]", "Exact [°C]", "|Δ|"].map((h) => (
                      <th key={h} className="label-caps px-2 py-1">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tempData.map((n) => (
                    <tr key={n.x} className="border-t border-border/60">
                      <td className="px-2 py-1">{n.x.toFixed(2)}</td>
                      <td className="px-2 py-1">{n.numerical.toFixed(2)}</td>
                      <td className="px-2 py-1">{n.analytical.toFixed(2)}</td>
                      <td className="px-2 py-1 text-muted-foreground">{Math.abs(n.numerical - n.analytical).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
