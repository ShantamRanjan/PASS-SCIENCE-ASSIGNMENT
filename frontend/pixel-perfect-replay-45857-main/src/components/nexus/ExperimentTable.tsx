import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExperimentRecord, ExperimentStatus } from "@/types/api";
import { Btn } from "./primitives";

const statusCls: Record<ExperimentStatus, string> = {
  completed: "text-success border-success/40",
  running: "text-primary border-primary/40",
  failed: "text-destructive border-destructive/40",
  queued: "text-muted-foreground border-border",
};

export function ExperimentTable({ rows, showExport, onExport }: { rows: ExperimentRecord[]; showExport?: boolean; onExport?: (r: ExperimentRecord) => void }) {
  return (
    <div className="min-w-0 max-w-full overflow-auto" role="region" aria-label="Experiments table" tabIndex={0}>
    <table className="w-full min-w-[540px] table-fixed text-xs">
      <colgroup>
        <col className="w-[96px]" />
        <col className="w-[23%]" />
        <col />
        <col className="w-[136px]" />
        <col className="w-[100px]" />
        {showExport && <col className="w-10" />}
      </colgroup>
      <thead>
        <tr className="border-b border-border text-left">
          {["ID", "Module", "Parameters", "Timestamp", "Status", ...(showExport ? [""] : [])].map((h) => (
            <th key={h} className="label-caps px-2 py-1.5 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="whitespace-nowrap px-2 py-2.5 font-mono text-primary">{r.id}</td>
            <td className="px-2 py-2.5"><span className="block truncate" title={r.module}>{r.module}</span></td>
            <td className="px-2 py-2.5 font-mono text-muted-foreground"><span className="block truncate" title={r.parameters}>{r.parameters}</span></td>
            <td className="whitespace-nowrap px-2 py-2.5 font-mono text-[10px] text-muted-foreground">{r.timestamp}</td>
            <td className="px-2 py-1.5">
              <span className={cn("inline-flex whitespace-nowrap rounded-sm border px-1.5 py-px font-mono text-[10px] uppercase", statusCls[r.status])}>{r.status}</span>
            </td>
            {showExport && (
              <td className="px-2 py-1.5 text-right">
                <Btn variant="ghost" onClick={() => onExport?.(r)} className="w-7 px-0 text-muted-foreground hover:text-primary" aria-label={`Export ${r.id}`} title={`Export ${r.id}`}>
                  <Download className="h-3.5 w-3.5" />
                </Btn>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
