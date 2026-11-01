import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/services/api";
import type { BackendInfo, BackendState } from "@/types/api";

interface Ctx {
  state: BackendState;
  info: BackendInfo | null;
  message: string | null;
  lastChecked: Date | null;
  check: () => Promise<void>;
}

const BackendContext = createContext<Ctx | null>(null);

export function BackendProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BackendState>("disconnected");
  const [info, setInfo] = useState<BackendInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setState("connecting");
    const r = await api.health();
    setLastChecked(new Date());
    if (r.ok) {
      setInfo(r.data);
      setMessage(null);
      setState("connected");
    } else {
      setInfo(null);
      setMessage(r.error.message);
      setState(r.error.code === "BACKEND_UNAVAILABLE" ? "disconnected" : "error");
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <BackendContext.Provider value={{ state, info, message, lastChecked, check }}>{children}</BackendContext.Provider>
  );
}

export function useBackend() {
  const c = useContext(BackendContext);
  if (!c) throw new Error("useBackend must be used inside BackendProvider");
  return c;
}
