import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { BackendProvider, useBackend } from "@/hooks/use-backend";
import { systemInformation } from "@/lib/system-information";
import type { ApiResult, BackendInfo } from "@/types/api";

const confirmed: BackendInfo = { version: "1.2.3", build: "native", compiler: "C++17", threads: 4, uptimeSeconds: 12 };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Real engine safeguards", () => {
  it("shows N/A for system information not obtained from the engine", () => {
    expect(systemInformation(null)).toEqual({ version: "N/A", operatingSystem: "N/A", cpu: "N/A", workers: "N/A", compiler: "N/A" });
    expect(systemInformation(confirmed)).toEqual({ version: "1.2.3", operatingSystem: "N/A", cpu: "N/A", workers: "4", compiler: "C++17" });
  });

  it("does not accept a successful HTTP response without valid engine confirmation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ connected: true }) }));
    expect(await api.health()).toEqual({ ok: false, error: { code: "UNKNOWN", message: "Engine health response was not valid." } });
  });

  it("only becomes connected after real health confirmation and clears stale information on failure", async () => {
    let finish: ((value: ApiResult<BackendInfo>) => void) | undefined;
    vi.spyOn(api, "health").mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce({ ok: false, error: { code: "BACKEND_UNAVAILABLE", message: "Offline" } })
      .mockResolvedValueOnce({ ok: false, error: { code: "TIMEOUT", message: "Timed out" } });
    const { result } = renderHook(() => useBackend(), { wrapper: BackendProvider });
    expect(result.current.state).toBe("connecting");
    expect(result.current.info).toBeNull();
    await act(async () => { finish?.({ ok: true, data: confirmed }); });
    await waitFor(() => expect(result.current.state).toBe("connected"));
    expect(result.current.info).toEqual(confirmed);
    expect(result.current.lastChecked).toBeInstanceOf(Date);
    await act(async () => { await result.current.check(); });
    expect(result.current.state).toBe("disconnected");
    expect(result.current.info).toBeNull();
    await act(async () => { await result.current.check(); });
    expect(result.current.state).toBe("error");
    expect(result.current.info).toBeNull();
  });
});