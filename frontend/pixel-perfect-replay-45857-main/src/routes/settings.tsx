import { createFileRoute } from "@tanstack/react-router";
import { Btn, Field, inputCls, PageHeader, Panel, StatusDot } from "@/components/nexus/primitives";
import { useBackend } from "@/hooks/use-backend";
import { APP_VERSION, BACKEND_URL } from "@/services/api";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/settings")({
  head: () => pageMeta("Settings", "Configure the NEXUS engine connection, solver defaults and interface."),
  component: Settings,
});

function Settings() {
  const { state, check } = useBackend();
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader title="Settings" subtitle="Engine connection, solver defaults and interface" />
      <div className="grid grid-cols-2 gap-3">
        <Panel title="Engine connection">
          <div className="space-y-2.5">
            <Field label="Endpoint"><input readOnly className={inputCls} value={BACKEND_URL} /></Field>
            <Field label="Executable"><input readOnly className={inputCls} value="nexus-core.exe" /></Field>
            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-2 font-mono text-xs uppercase"><StatusDot state={state} />{state}</span>
              <Btn onClick={() => void check()}>Test connection</Btn>
            </div>
          </div>
        </Panel>
        <Panel title="Solver defaults">
          <div className="space-y-2.5">
            <Field label="Default mesh" unit="elements">
              <select className={inputCls} defaultValue="20">{[10, 20, 40, 80].map((m) => <option key={m}>{m}</option>)}</select>
            </Field>
            <Field label="Default workers">
              <select className={inputCls} defaultValue="4">{[1, 2, 3, 4].map((m) => <option key={m}>{m}</option>)}</select>
            </Field>
          </div>
        </Panel>
        <Panel title="Interface">
          <Field label="Theme"><select className={inputCls} defaultValue="navy"><option value="navy">Navy Dark</option></select></Field>
        </Panel>
        <Panel title="About">
          <dl className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Version</dt><dd>{APP_VERSION}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Shell</dt><dd>Tauri 2</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Engine</dt><dd>C++17</dd></div>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
