import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DemoBadge, inputCls, PageHeader, Panel, StateView } from "@/components/nexus/primitives";
import { ExperimentTable } from "@/components/nexus/ExperimentTable";
import { DEMO_EXPERIMENTS } from "@/lib/demo-data";
import { api } from "@/services/api";
import type { ExperimentRecord } from "@/types/api";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/history")({
  head: () => pageMeta("Experiment History", "Search and export past simulation experiments."),
  component: History,
});

function History() {
  const [rows, setRows] = useState<ExperimentRecord[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    void api.history.list().then((r) => {
      if (r.ok) {
        setRows(r.data);
        setLive(true);
      } else setRows(DEMO_EXPERIMENTS);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) => [r.id, r.module, r.parameters, r.status, r.timestamp].some((v) => v.toLowerCase().includes(s)));
  }, [rows, q]);

  function exportRow(r: ExperimentRecord) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...r, demo: !live }, null, 2)], { type: "application/json" }));
    a.download = `${r.id}.json`;
    a.click();
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Experiment History" subtitle="All solver runs recorded by the engine" />
      <Panel
        title={`Experiments · ${filtered.length}`}
        actions={
          <>
            {!live && !loading && <DemoBadge />}
            <div className="relative">
              <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <input placeholder="Search ID, module, parameters…" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} h-6 w-64 pl-7`} />
            </div>
          </>
        }
        bodyClassName="p-0"
      >
        {loading ? (
          <StateView state="loading" />
        ) : filtered.length === 0 ? (
          <StateView state="empty" message="No experiments match your search." />
        ) : (
          <ExperimentTable rows={filtered} showExport onExport={exportRow} />
        )}
      </Panel>
    </div>
  );
}
