"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney, type Subscription } from "@/lib/subscriptions";
import { useSubscriptionStats } from "@/hooks/useSubscriptionStats";

interface CategoryChartProps {
  subscriptions?: Subscription[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { color: string };
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: raw } = payload[0];

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1f] px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: raw.color }}
        />
        <span className="text-[13px] text-zinc-300">{name}</span>
      </div>
      <span className="tabular-nums text-[14px] font-semibold text-white">
        {formatMoney(Number(value))}
      </span>
    </div>
  );
}

export function CategoryChart({ subscriptions = [] }: CategoryChartProps) {
  const { categoryBreakdown: data, monthlyTotal: total } =
    useSubscriptionStats(subscriptions);

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-[#111114] p-5">
        <h2 className="mb-1 text-[15px] font-semibold text-white">支出分布</h2>
        <p className="mb-4 text-[13px] text-zinc-500">按类别 · 月均</p>
        <div className="py-10 text-center text-[13px] text-zinc-600">
          暂无数据
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#111114] p-5">
      <h2 className="mb-1 text-[15px] font-semibold text-white">支出分布</h2>
      <p className="mb-4 text-[13px] text-zinc-500">按类别 · 月均</p>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="relative h-40 w-40 shrink-0 sm:h-44 sm:w-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="88%"
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                cornerRadius={4}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">
              月均支出
            </span>
            <span className="text-xl font-semibold text-white tabular-nums">
              {formatMoney(total).replace(".00", "")}
            </span>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-1">
          {data.map((item) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="shrink-0 text-[13px] text-zinc-300">
                  {item.name}
                </span>
                <span className="ml-auto text-[11px] tabular-nums text-zinc-600">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

