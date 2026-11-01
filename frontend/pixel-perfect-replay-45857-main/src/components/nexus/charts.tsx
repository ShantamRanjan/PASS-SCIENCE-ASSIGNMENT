import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { stroke: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" };
const tooltip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 2,
    fontSize: 11,
    fontFamily: "var(--font-mono)",
  },
};

export interface Series {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
}

export function NLineChart({
  data,
  x,
  series,
  height = 220,
  logY,
}: {
  data: Record<string, number>[];
  x: string;
  series: Series[];
  height?: number;
  logY?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" />
        <XAxis dataKey={x} tick={axis} stroke="var(--border)" />
        <YAxis tick={axis} stroke="var(--border)" scale={logY ? "log" : "auto"} {...(logY ? { domain: ["auto", "auto"] as [string, string] } : {})} />
        <Tooltip {...tooltip} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={1.5}
            strokeDasharray={s.dashed ? "4 3" : undefined}
            dot={{ r: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function NBarChart({
  data,
  x,
  series,
  height = 220,
}: {
  data: Record<string, number>[];
  x: string;
  series: Series[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" />
        <XAxis dataKey={x} tick={axis} stroke="var(--border)" />
        <YAxis tick={axis} stroke="var(--border)" />
        <Tooltip {...tooltip} cursor={{ fill: "var(--muted)" }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
