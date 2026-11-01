import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import { BackendGuardNote, Btn, DemoBadge, Field, inputCls, Metric, PageHeader, Panel, StateView } from "@/components/nexus/primitives";
import { NLineChart } from "@/components/nexus/charts";
import { DEMO_LOSS } from "@/lib/demo-data";
import { useBackend } from "@/hooks/use-backend";
import { api } from "@/services/api";
import type { NeuralResult } from "@/types/api";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/neural")({
  head: () => pageMeta("Neural Network Lab", "Inspect forward propagation, loss and gradient verification for a small network."),
  component: Neural,
});

const ARCH = [2, 3, 1];

function NetworkDiagram({ layers }: { layers: number[] }) {
  const W = 420, H = 220;
  const xs = layers.map((_, i) => 50 + (i * (W - 100)) / (layers.length - 1));
  const pos = layers.map((n, i) => Array.from({ length: n }, (_, j) => ({ x: xs[i], y: (H / (n + 1)) * (j + 1) })));
  const labels = ["Input", "Hidden (σ)", "Output (σ)"];
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
      {pos.slice(0, -1).map((layer, i) =>
        layer.flatMap((a, ai) =>
          (pos[i + 1] ?? []).map((b, bi) => (
            <line key={`${i}-${ai}-${bi}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth={1} />
          )),
        ),
      )}
      {pos.map((layer, i) =>
        layer.map((n, j) => (
          <g key={`${i}-${j}`}>
            <circle cx={n.x} cy={n.y} r={14} fill="var(--viewport)" stroke="var(--primary)" strokeWidth={1.5} />
            <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={9} fill="var(--foreground)" fontFamily="var(--font-mono)">
              {i === 0 ? `x${j + 1}` : i === layers.length - 1 ? "ŷ" : `h${j + 1}`}
            </text>
          </g>
        )),
      )}
      {xs.map((x, i) => (
        <text key={i} x={x} y={H + 14} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
          {labels[i]}
        </text>
      ))}
    </svg>
  );
}

function Neural() {
  const { state } = useBackend();
  const [seed, setSeed] = useState(42);
  const [lr, setLr] = useState(0.1);
  const [epochs, setEpochs] = useState(150);
  const [r, setR] = useState<NeuralResult | null>(null);
  const [status, setStatus] = useState<"empty" | "loading" | "error" | "disconnected" | "success">("empty");
  const [err, setErr] = useState<string>();

  async function run() {
    setStatus("loading");
    const res = await api.neural.run(seed);
    if (res.ok) {
      setR(res.data);
      setStatus("success");
    } else {
      setErr(res.error.message);
      setStatus(res.error.code === "BACKEND_UNAVAILABLE" ? "disconnected" : "error");
    }
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Neural Network Lab" subtitle="2-3-1 feed-forward network · sigmoid activations · binary cross-entropy" />
      <BackendGuardNote />
      <div className="grid grid-cols-[1fr_1fr_280px] gap-3">
        <Panel title="Network architecture" className="col-span-2">
          <NetworkDiagram layers={r?.architecture ?? ARCH} />
        </Panel>
        <Panel title="Initial parameters">
          <div className="space-y-2.5">
            <Field label="Random seed"><input type="number" className={inputCls} value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></Field>
            <Field label="Learning rate"><input type="number" step={0.01} className={inputCls} value={lr} onChange={(e) => setLr(Number(e.target.value))} /></Field>
            <Field label="Epochs"><input type="number" className={inputCls} value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} /></Field>
            <Btn variant="primary" className="w-full" onClick={run} disabled={state !== "connected" || status === "loading"}>
              <Play /> Run forward + backprop
            </Btn>
          </div>
        </Panel>

        <Panel title="Forward propagation">
          <StateView state={status} message={status === "empty" ? "Run the network to view layer activations." : err}>
            <div className="space-y-1 font-mono text-[11px]">
              {r?.forward.map((f) => (
                <div key={f.layer} className="flex justify-between">
                  <span className="text-muted-foreground">Layer {f.layer}</span>
                  <span>[{f.activations.map((a) => a.toFixed(4)).join(", ")}]</span>
                </div>
              ))}
            </div>
          </StateView>
        </Panel>
        <Panel title="Loss calculation">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="BCE loss" value={r ? r.loss.toFixed(6) : "—"} />
            <Metric label="Parameters" value={ARCH.slice(1).reduce((s, n, i) => s + n * ((ARCH[i] ?? 0) + 1), 0)} />
          </div>
        </Panel>
        <Panel title="Gradient verification" bodyClassName="p-0">
          <StateView state={status} message={status === "empty" ? "Finite-difference check runs with the forward pass." : err}>
            <table className="w-full font-mono text-[10.5px]">
              <thead>
                <tr className="text-left">
                  {["θ", "Analytic", "Numeric", "Rel. err"].map((h) => <th key={h} className="label-caps px-2 py-1">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {r?.gradientCheck.map((g) => (
                  <tr key={g.parameter} className="border-t border-border/60">
                    <td className="px-2 py-1">{g.parameter}</td>
                    <td className="px-2 py-1">{g.analytical.toExponential(3)}</td>
                    <td className="px-2 py-1">{g.numerical.toExponential(3)}</td>
                    <td className={g.relError < 1e-6 ? "px-2 py-1 text-success" : "px-2 py-1 text-warning"}>{g.relError.toExponential(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StateView>
        </Panel>

        <Panel title="Training loss" className="col-span-3" actions={!r && <DemoBadge />}>
          <NLineChart data={r?.lossHistory ?? DEMO_LOSS} x="epoch" height={220} series={[{ key: "loss", name: "Loss", color: "var(--chart-1)" }]} />
        </Panel>
      </div>
    </div>
  );
}
