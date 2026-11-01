// Contracts for responses from the NEXUS C++17 engineering backend.
// The frontend never computes engineering results; it only renders these.

export type BackendState = "disconnected" | "connecting" | "connected" | "error";

export interface BackendInfo {
  version: string;
  build: string;
  compiler: string;
  threads: number;
  uptimeSeconds: number;
  operatingSystem?: string;
  cpu?: string;
}

export interface ApiError {
  code: "BACKEND_UNAVAILABLE" | "INVALID_INPUT" | "SOLVER_FAILURE" | "TIMEOUT" | "UNKNOWN";
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// Geometry
export interface MeshMetadata {
  fileName: string;
  triangles: number;
  vertices: number;
  boundingBox: { min: [number, number, number]; max: [number, number, number] };
  surfaceArea: number;
  volume: number;
  watertight: boolean;
}

export interface TemperaturePoint {
  x: number;
  y: number;
  z: number;
  t: number;
}

// Thermal (1D steady-state conduction with generation)
export interface ThermalParams {
  length: number;
  area: number;
  conductivity: number;
  heatGeneration: number;
  tLeft: number;
  tRight: number;
  elements: 10 | 20 | 40 | 80;
}

export interface ThermalNode {
  x: number;
  numerical: number;
  analytical: number;
}

export interface ThermalResult {
  nodes: ThermalNode[];
  maxAbsError: number;
  solveTimeMs: number;
  convergence: { elements: number; maxAbsError: number }[];
}

// Performance
export interface BenchmarkParams {
  workers: 1 | 2 | 3 | 4;
  cases: number;
  meshSize: number;
}

export interface BenchmarkResult {
  serialMs: number;
  parallelMs: number;
  speedup: number;
  efficiency: number;
  perWorker: { workers: number; timeMs: number; speedup: number }[];
}

// Hardware
export type DeviceKind = "mcu" | "fpga" | "jtag";
export interface DeviceStatus {
  id: string;
  kind: DeviceKind;
  connected: boolean;
  port: string | null;
  firmware: string | null;
  telemetry: Record<string, number>;
}

// Neural network
export interface NeuralResult {
  architecture: number[];
  forward: { layer: number; activations: number[] }[];
  loss: number;
  gradientCheck: { parameter: string; analytical: number; numerical: number; relError: number }[];
  lossHistory: { epoch: number; loss: number }[];
}

// History
export type ExperimentStatus = "completed" | "running" | "failed" | "queued";
export interface ExperimentRecord {
  id: string;
  module: string;
  parameters: string;
  timestamp: string;
  status: ExperimentStatus;
}
