"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { Subscription } from "@/lib/subscriptions";
import { useSubscriptionStats } from "@/hooks/useSubscriptionStats";

interface ForecastChartProps {
  subscriptions?: Subscription[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#1a1a1f] border border-white/[0.08] px-3 py-2 shadow-xl">
      <div className="text-[12px] text-zinc-500 mb-1">{label}</div>
      <span className="text-[14px] font-semibold text-white tabular-nums">
        ${Number(payload[0].value).toFixed(2)}
      </span>
    </div>
  );
}

const BAR_GRADIENT_ID = "forecast-gradient";

export function ForecastChart({ subscriptions = [] }: ForecastChartProps) {
  const { monthlyForecast: data } = useSubscriptionStats(subscriptions);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#111114] p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-violet-400 opacity-60" />
          <h2 className="text-[15px] font-semibold text-white">预期支出</h2>
        </div>
        <p className="text-[13px] text-zinc-500 mb-4">未来 6 个月</p>
        <div className="py-10 text-center text-[13px] text-zinc-600">
          暂无数据
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.total));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111114] p-5">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-violet-400 opacity-60" />
        <h2 className="text-[15px] font-semibold text-white">预期支出</h2>
      </div>
      <p className="text-[13px] text-zinc-500 mb-5">未来 6 个月</p>

      <div className="w-full h-52 sm:h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            barCategoryGap="25%"
          >
            <defs>
              <linearGradient
                id={BAR_GRADIENT_ID}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,0.04)"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52525b", fontSize: 11 }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar
              dataKey="total"
              radius={[4, 4, 0, 0]}
              fill={`url(#${BAR_GRADIENT_ID})`}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.total === maxVal
                      ? "#8b5cf6"
                      : `url(#${BAR_GRADIENT_ID})`
                  }
                  opacity={entry.total === maxVal ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
