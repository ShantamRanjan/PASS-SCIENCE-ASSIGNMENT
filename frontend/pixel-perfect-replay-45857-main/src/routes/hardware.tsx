import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CircuitBoard, Cpu, Plug, Unplug, Usb } from "lucide-react";
import { BackendGuardNote, Btn, PageHeader, Panel, StatusDot } from "@/components/nexus/primitives";
import { useBackend } from "@/hooks/use-backend";
import { api } from "@/services/api";
import type { DeviceKind, DeviceStatus } from "@/types/api";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/hardware")({
  head: () => pageMeta("Hardware Integration", "Connect microcontroller, FPGA and JTAG devices and view live telemetry."),
  component: Hardware,
});

const DEVICES: { kind: DeviceKind; name: string; icon: typeof Cpu; caps: string[]; telemetry: string[] }[] = [
  { kind: "mcu", name: "Microcontroller", icon: Cpu, caps: ["UART @ 115200", "ADC sampling", "PWM output", "Firmware flash"], telemetry: ["Core temp [°C]", "Supply [V]", "Loop rate [Hz]"] },
  { kind: "fpga", name: "FPGA", icon: CircuitBoard, caps: ["Bitstream load", "Hardware FEM kernel", "DMA transfer", "Clock config"], telemetry: ["Fabric temp [°C]", "Clock [MHz]", "LUT usage [%]"] },
  { kind: "jtag", name: "JTAG Adapter", icon: Usb, caps: ["Boundary scan", "Chain detection", "Debug halt/step", "Memory read"], telemetry: ["TCK [MHz]", "Devices in chain", "Vref [V]"] },
];

function Hardware() {
  const { state } = useBackend();
  const [devices, setDevices] = useState<Partial<Record<DeviceKind, DeviceStatus>>>({});
  const [busy, setBusy] = useState<DeviceKind | null>(null);
  const [errors, setErrors] = useState<Partial<Record<DeviceKind, string>>>({});

  async function toggle(kind: DeviceKind) {
    setBusy(kind);
    const connected = devices[kind]?.connected;
    const r = connected ? await api.hardware.disconnect(kind) : await api.hardware.connect(kind);
    if (r.ok) {
      setDevices((d) => ({ ...d, [kind]: r.data }));
      setErrors((e) => ({ ...e, [kind]: undefined }));
    } else setErrors((e) => ({ ...e, [kind]: r.error.message }));
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Hardware Integration" subtitle="Device bridge via native engine drivers" />
      <BackendGuardNote />
      <div className="grid grid-cols-3 gap-3">
        {DEVICES.map((d) => {
          const s = devices[d.kind];
          const devState = busy === d.kind ? "connecting" : s?.connected ? "connected" : errors[d.kind] ? "error" : "disconnected";
          return (
            <Panel
              key={d.kind}
              title={d.name}
              actions={
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-muted-foreground">
                  <StatusDot state={devState} /> {devState}
                </span>
              }
            >
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="flex h-10 w-10 items-center justify-center border border-border bg-viewport rounded-sm">
                  <d.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  <div>Port: {s?.port ?? "—"}</div>
                  <div>Firmware: {s?.firmware ?? "—"}</div>
                </div>
              </div>
              <div className="py-3">
                <div className="label-caps mb-1.5">Capabilities</div>
                <ul className="grid grid-cols-2 gap-1 text-[11px]">
                  {d.caps.map((c) => (
                    <li key={c} className="border border-border/70 px-1.5 py-1 text-muted-foreground rounded-sm">{c}</li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border pt-3">
                <div className="label-caps mb-1.5">Telemetry</div>
                <dl className="space-y-1 font-mono text-[11px]">
                  {d.telemetry.map((t) => (
                    <div key={t} className="flex justify-between">
                      <dt className="text-muted-foreground">{t}</dt>
                      <dd>{s?.telemetry[t]?.toString() ?? "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {errors[d.kind] && <p className="mt-2 text-[11px] text-destructive">{errors[d.kind]}</p>}
              <Btn
                variant={s?.connected ? "danger" : "primary"}
                className="mt-3 w-full"
                disabled={state !== "connected" || busy === d.kind}
                onClick={() => toggle(d.kind)}
              >
                {s?.connected ? <><Unplug /> Disconnect</> : <><Plug /> Connect</>}
              </Btn>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
