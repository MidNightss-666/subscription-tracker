"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Subscription } from "@/lib/subscriptions";
import { useSubscriptionStats } from "@/hooks/useSubscriptionStats";

interface CategoryChartProps {
  subscriptions?: Subscription[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: raw } = payload[0];
  return (
    <div className="rounded-lg bg-[#1a1a1f] border border-white/[0.08] px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: raw.color }}
        />
        <span className="text-[13px] text-zinc-300">{name}</span>
      </div>
      <span className="text-[14px] font-semibold text-white tabular-nums">
        ${Number(value).toFixed(2)}
      </span>
    </div>
  );
}

export function CategoryChart({ subscriptions = [] }: CategoryChartProps) {
  const { categoryBreakdown: data, monthlyTotal: total } =
    useSubscriptionStats(subscriptions);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#111114] p-5">
        <h2 className="text-[15px] font-semibold text-white mb-1">支出分布</h2>
        <p className="text-[13px] text-zinc-500 mb-4">按类别</p>
        <div className="py-10 text-center text-[13px] text-zinc-600">
          暂无数据
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111114] p-5">
      <h2 className="text-[15px] font-semibold text-white mb-1">支出分布</h2>
      <p className="text-[13px] text-zinc-500 mb-4">按类别 · 月均</p>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
        {/* 环形图 */}
        <div className="relative w-40 h-40 sm:w-44 sm:h-44 shrink-0">
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
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* 中心文字 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
              月支出
            </span>
            <span className="text-xl font-semibold text-white tabular-nums">
              ${total.toFixed(0)}
            </span>
          </div>
        </div>

        {/* 类别列表 */}
        <div className="flex flex-col gap-2.5 w-full sm:flex-1 min-w-0">
          {data.map((d) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-[13px] text-zinc-300 shrink-0">
                  {d.name}
                </span>
                <span className="text-[11px] text-zinc-600 tabular-nums ml-auto">
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
