import { cn } from "@/lib/utils";

type ActivityPoint = {
  label: string;
  date: string;
  users: number;
  complaints: number;
  transactions: number;
  messages: number;
  total: number;
};

type ActivityChartProps = {
  data: ActivityPoint[];
  compact?: boolean;
};

type SeriesConfig = {
  key: keyof Pick<ActivityPoint, "users" | "messages" | "complaints" | "transactions">;
  label: string;
  color: string;
  fill: string;
};

const series: SeriesConfig[] = [
  { key: "users", label: "مستخدمون جدد", color: "#0f766e", fill: "bg-teal-600" },
  { key: "messages", label: "رسائل", color: "#ea580c", fill: "bg-orange-600" },
  { key: "complaints", label: "بلاغات", color: "#dc2626", fill: "bg-red-600" },
  { key: "transactions", label: "عمليات", color: "#2563eb", fill: "bg-blue-600" },
];

function buildPolyline(points: ActivityPoint[], key: SeriesConfig["key"], maxValue: number) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const value = point[key];
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

export function ActivityChart({ data, compact = false }: ActivityChartProps) {
  const chartData = data.length > 0 ? data : [{ label: "-", date: "-", users: 0, messages: 0, complaints: 0, transactions: 0, total: 0 }];
  const maxValue = Math.max(
    1,
    ...chartData.flatMap((point) => [point.users, point.messages, point.complaints, point.transactions]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {series.map((item) => (
          <div key={item.key} className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-full", item.fill)} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
        <div className="relative h-64 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.08),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(248,250,252,0.95))] p-4">
          <div className="pointer-events-none absolute inset-4 grid grid-rows-4">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="border-t border-dashed border-slate-200/90" />
            ))}
          </div>

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative z-10 h-full w-full overflow-visible">
            {series.map((item) => (
              <polyline
                key={item.key}
                fill="none"
                stroke={item.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildPolyline(chartData, item.key, maxValue)}
              />
            ))}
            {series.flatMap((item) =>
              chartData.map((point, index) => {
                const x = (index / Math.max(chartData.length - 1, 1)) * 100;
                const y = 100 - (point[item.key] / maxValue) * 100;
                return (
                  <circle
                    key={`${item.key}-${point.date}`}
                    cx={x}
                    cy={y}
                    r="1.9"
                    fill="white"
                    stroke={item.color}
                    strokeWidth="1.4"
                  />
                );
              }),
            )}
          </svg>
        </div>

        <div className={cn("mt-4 gap-3", compact ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" : "grid grid-cols-2 sm:grid-cols-4")}>
          {chartData.map((point) => (
            <div key={point.date} className="rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{point.label}</span>
                <span>{point.total}</span>
              </div>
              <div className="mt-3 flex h-20 items-end gap-1.5">
                {series.map((item) => {
                  const value = point[item.key];
                  const height = maxValue === 0 ? 6 : Math.max((value / maxValue) * 100, value > 0 ? 12 : 6);
                  return (
                    <div key={`${point.date}-${item.key}`} className="flex-1">
                      <div
                        className={cn("w-full rounded-t-md transition-all", item.fill)}
                        style={{ height: `${height}%` }}
                        title={`${item.label}: ${value}`}
                      />
                    </div>
                  );
                })}
              </div>
              {!compact && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <span>جدد: {point.users}</span>
                  <span>رسائل: {point.messages}</span>
                  <span>بلاغات: {point.complaints}</span>
                  <span>عمليات: {point.transactions}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
