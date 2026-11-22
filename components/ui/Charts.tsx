import { formatCurrency } from "@/lib/utils";
import type { RevenuePoint } from "@/lib/types";

export function RevenueChart({
  data,
  caption = "Revenue trend",
  currency = "PKR",
}: {
  data: RevenuePoint[];
  caption?: string;
  currency?: string;
}) {
  const max = Math.max(...data.map((point) => point.revenue), 1);

  return (
    <div className="space-y-4">
      <div className="flex h-48 items-end gap-2 sm:gap-3">
        {data.map((point) => {
          const height = Math.max((point.revenue / max) * 100, 8);
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="group relative flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-navy transition hover:bg-orange"
                  style={{ height: `${height}%` }}
                  title={formatCurrency(point.revenue, currency)}
                />
              </div>
              <span className="text-xs text-muted">{point.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{caption}</span>
        <span>Peak {formatCurrency(max, currency)}</span>
      </div>
    </div>
  );
}

export function OrderStatusChart({
  data,
  centerLabel = "orders",
}: {
  data: { label: string; value: number; color: string }[];
  centerLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const segments = data.reduce<
    { label: string; value: number; color: string; dash: number; offset: number }[]
  >((acc, item) => {
    const dash = (item.value / total) * 100;
    const offset = acc.reduce((sum, segment) => sum + segment.dash, 0);
    acc.push({ ...item, dash, offset });
    return acc;
  }, []);

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 120 120" className="mx-auto h-36 w-36">
        {segments.map((item) => (
          <circle
            key={item.label}
            r="15.915"
            cx="60"
            cy="60"
            fill="transparent"
            stroke={item.color}
            strokeWidth="8"
            strokeDasharray={`${item.dash} ${100 - item.dash}`}
            strokeDashoffset={25 - item.offset}
          />
        ))}
        <text
          x="60"
          y="58"
          textAnchor="middle"
          className="fill-navy text-[12px] font-semibold"
        >
          {total}
        </text>
        <text
          x="60"
          y="72"
          textAnchor="middle"
          className="fill-muted text-[7px]"
        >
          {centerLabel}
        </text>
      </svg>
      <ul className="space-y-2">
        {data.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-6 text-sm">
            <span className="inline-flex items-center gap-2 text-navy">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
            <span className="font-medium text-muted">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
