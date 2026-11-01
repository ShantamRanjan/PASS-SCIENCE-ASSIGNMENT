// Single gateway to the native C++ backend. In the packaged Tauri build this
// will be swapped for Tauri IPC (invoke). No responses are ever fabricated here.
import type {
  ApiResult,
  BackendInfo,
  BenchmarkParams,
  BenchmarkResult,
  DeviceKind,
  DeviceStatus,
  ExperimentRecord,
  MeshMetadata,
  NeuralResult,
  ThermalParams,
  ThermalResult,
} from "@/types/api";

export const APP_VERSION = "0.1.0-alpha";
export const BACKEND_URL = "http://127.0.0.1:7878";
const TIMEOUT_MS = 2500;

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        ok: false,
        error: { code: body?.code ?? "SOLVER_FAILURE", message: body?.message ?? `HTTP ${res.status}` },
      };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? { code: "TIMEOUT", message: "Backend did not respond in time." }
        : { code: "BACKEND_UNAVAILABLE", message: "NEXUS engine (nexus-core.exe) is not running." },
    };
  } finally {
    clearTimeout(timer);
  }
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

async function health(): Promise<ApiResult<BackendInfo>> {
  const result = await request<BackendInfo>("/health");
  if (!result.ok) return result;
  const info = result.data;
  if (!info || typeof info.version !== "string" || !info.version.trim() ||
      typeof info.build !== "string" || typeof info.compiler !== "string" ||
      !Number.isInteger(info.threads) || info.threads < 0 ||
      !Number.isFinite(info.uptimeSeconds) || info.uptimeSeconds < 0) {
    return { ok: false, error: { code: "UNKNOWN", message: "Engine health response was not valid." } };
  }
  return result;
}

export const api = {
  health,
  geometry: {
    uploadStl: (file: File) =>
      request<MeshMetadata>("/geometry/stl", { method: "POST", body: file, headers: { "Content-Type": "application/octet-stream" } }),
  },
  thermal: { solve: (p: ThermalParams) => post<ThermalResult>("/thermal/solve", p) },
  performance: { run: (p: BenchmarkParams) => post<BenchmarkResult>("/performance/benchmark", p) },
  hardware: {
    connect: (kind: DeviceKind) => post<DeviceStatus>(`/hardware/${kind}/connect`, {}),
    disconnect: (kind: DeviceKind) => post<DeviceStatus>(`/hardware/${kind}/disconnect`, {}),
  },
  neural: { run: (seed: number) => post<NeuralResult>("/neural/run", { seed }) },
  history: { list: () => request<ExperimentRecord[]>("/experiments") },
};
