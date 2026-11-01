import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Inbox, Loader2, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBackend } from "@/hooks/use-backend";
import type { BackendState } from "@/types/api";

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col border border-border bg-panel rounded-sm", className)}>
      {title && (
        <header className="grid min-h-8 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-panel-header px-3 py-1">
          <h3 className="label-caps min-w-0">{title}</h3>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </header>
      )}
      <div className={cn("min-h-0 min-w-0 flex-1 p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-sm border border-demo/50 bg-demo/10 px-1.5 py-px font-mono text-[10px] font-semibold tracking-wider text-demo">
      DEMO DATA
    </span>
  );
}

const stateStyle: Record<BackendState, string> = {
  connected: "bg-success",
  connecting: "bg-warning animate-pulse",
  disconnected: "bg-muted-foreground",
  error: "bg-destructive",
};

export function StatusDot({ state }: { state: BackendState }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full motion-reduce:animate-none", stateStyle[state])} />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)] items-end gap-3 border-b border-border pb-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Variant = "primary" | "ghost" | "outline" | "danger";
const btn: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/85 border border-primary",
  outline: "border border-input bg-secondary/40 hover:bg-secondary text-foreground",
  ghost: "border border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground",
  danger: "border border-destructive/60 text-destructive hover:bg-destructive/10",
};
export function Btn({
  variant = "outline",
  className,
  ...p
}: React.ComponentPropsWithRef<"button"> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex h-7 items-center justify-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:h-3.5 [&_svg]:w-3.5",
        btn[variant],
        className,
      )}
    />
  );
}

export function Field({ label, unit, children }: { label: string; unit?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between label-caps">
        <span>{label}</span>
        {unit && <span className="font-mono normal-case tracking-normal">{unit}</span>}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "h-7 w-full rounded-sm border border-input bg-viewport px-2 font-mono text-xs text-foreground outline-none focus:border-primary";

export function Metric({ label, value, unit, demo }: { label: string; value: ReactNode; unit?: string; demo?: boolean }) {
  return (
    <div className="border border-border bg-viewport/60 px-3 py-2 rounded-sm">
      <div className="label-caps flex items-center justify-between">
        {label}
        {demo && <span className="text-[9px] text-demo">DEMO</span>}
      </div>
      <div className="mt-1 font-mono text-base text-foreground">
        {value}
        {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

type ViewState = "loading" | "empty" | "disconnected" | "success" | "error";
export function StateView({ state, message, children }: { state: ViewState; message?: string | undefined; children?: ReactNode }) {
  if (state === "success") return <>{children}</>;
  const map = {
    loading: { icon: Loader2, cls: "animate-spin text-primary", title: "Computing…" },
    empty: { icon: Inbox, cls: "text-muted-foreground", title: "No results yet" },
    disconnected: { icon: PlugZap, cls: "text-muted-foreground", title: "Backend disconnected" },
    error: { icon: AlertTriangle, cls: "text-destructive", title: "Request failed" },
  }[state];
  const Icon = map.icon;
  return (
    <div className="flex h-full min-h-28 flex-col items-center justify-center gap-1.5 text-center">
      <Icon className={cn("h-5 w-5", map.cls)} />
      <div className="text-xs font-medium">{map.title}</div>
      {message && <div className="max-w-xs text-[11px] text-muted-foreground">{message}</div>}
    </div>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-success">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

export function BackendGuardNote() {
  const { state, message } = useBackend();
  if (state === "connected") return null;
  return (
    <div className="mb-4 flex items-center gap-2 border border-border border-l-2 border-l-warning bg-panel px-3 py-2 text-xs rounded-sm">
      <PlugZap className="h-3.5 w-3.5 text-warning" />
      <span className="text-muted-foreground">
        {state === "connecting" ? "Connecting to NEXUS engine…" : message ?? "Engine offline."} Solver actions are disabled.
        Charts below show labelled demo data only.
      </span>
    </div>
  );
}
