import type { BackendInfo } from "@/types/api";

const available = (value: unknown) => typeof value === "string" && value.trim() ? value : "N/A";

// System values come only from the confirmed native engine, never browser guesses.
export function systemInformation(info: BackendInfo | null) {
  return {
    version: available(info?.version),
    operatingSystem: available(info?.operatingSystem),
    cpu: available(info?.cpu),
    compiler: available(info?.compiler),
    workers: info && Number.isInteger(info.threads) && info.threads >= 0 ? String(info.threads) : "N/A",
  };
}