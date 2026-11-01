// Static DEMO DATA for layout preview only. Every UI that renders this must
// show the <DemoBadge />. These are hand-written constants, not computed results.
import type { ExperimentRecord } from "@/types/api";

export const DEMO_EXPERIMENTS: ExperimentRecord[] = [
  { id: "EXP-0142", module: "Thermal Analysis", parameters: "L=1.0m, k=45, n=40", timestamp: "2026-10-31 16:42", status: "completed" },
  { id: "EXP-0141", module: "Performance Lab", parameters: "workers=4, cases=64", timestamp: "2026-10-31 15:10", status: "completed" },
  { id: "EXP-0140", module: "Neural Network Lab", parameters: "arch=2-3-1, lr=0.1", timestamp: "2026-10-31 11:03", status: "failed" },
  { id: "EXP-0139", module: "Geometry Workbench", parameters: "bracket_v2.stl", timestamp: "2026-10-30 18:55", status: "completed" },
  { id: "EXP-0138", module: "Thermal Analysis", parameters: "L=0.5m, k=205, n=80", timestamp: "2026-10-30 14:21", status: "completed" },
  { id: "EXP-0137", module: "Hardware Integration", parameters: "FPGA loopback", timestamp: "2026-10-29 09:47", status: "queued" },
];

export const DEMO_THERMAL = [
  { x: 0, numerical: 100, analytical: 100 },
  { x: 0.1, numerical: 118.2, analytical: 118.0 },
  { x: 0.2, numerical: 132.1, analytical: 132.0 },
  { x: 0.3, numerical: 142.1, analytical: 142.0 },
  { x: 0.4, numerical: 148.0, analytical: 148.0 },
  { x: 0.5, numerical: 150.1, analytical: 150.0 },
  { x: 0.6, numerical: 148.0, analytical: 148.0 },
  { x: 0.7, numerical: 142.1, analytical: 142.0 },
  { x: 0.8, numerical: 132.1, analytical: 132.0 },
  { x: 0.9, numerical: 118.2, analytical: 118.0 },
  { x: 1.0, numerical: 100, analytical: 100 },
];

export const DEMO_CONVERGENCE = [
  { elements: 10, error: 0.21 },
  { elements: 20, error: 0.054 },
  { elements: 40, error: 0.013 },
  { elements: 80, error: 0.0034 },
];

export const DEMO_BENCH = [
  { workers: 1, speedup: 1.0, time: 4820 },
  { workers: 2, speedup: 1.86, time: 2590 },
  { workers: 3, speedup: 2.61, time: 1846 },
  { workers: 4, speedup: 3.22, time: 1497 },
];

export const DEMO_LOSS = [0.693, 0.61, 0.52, 0.43, 0.35, 0.29, 0.24, 0.2, 0.17, 0.15, 0.135, 0.124, 0.116, 0.11, 0.106].map(
  (loss, epoch) => ({ epoch: epoch * 10, loss }),
);
