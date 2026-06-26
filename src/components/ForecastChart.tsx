"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { formatMoney, type Subscription } from "@/lib/subscriptions";
import { useSubscriptionStats } from "@/hooks/useSubscriptionStats";

interface ForecastChartProps {
  subscriptions?: Subscription[];
}

interface TooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ value: number }>;
  reportingCurrency: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  reportingCurrency,
}: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-popover-foreground shadow-xl">
      <div className="mb-1 text-[12px] text-muted-foreground">{label}</div>
      <span className="tabular-nums text-[14px] font-semibold text-foreground">
        {formatMoney(Number(payload[0].value), reportingCurrency)}
      </span>
    </div>
  );
}

const BAR_GRADIENT_ID = "forecast-gradient";

export function ForecastChart({ subscriptions = [] }: ForecastChartProps) {
  const { monthlyForecast: data, reportingCurrency } =
    useSubscriptionStats(subscriptions);
  const hasData = data.some((item) => item.total > 0);
  const maxVal = Math.max(...data.map((item) => item.total), 0);

  return (
    <div className="rounded-lg border border-border/70 bg-card/75 p-5 shadow-xl shadow-black/5 backdrop-blur-xl">
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-violet-400 opacity-70" />
        <h2 className="text-[15px] font-semibold text-foreground">预计支出</h2>
      </div>
      <p className="mb-5 text-[13px] text-muted-foreground">未来 6 个自然月</p>

      {!hasData ? (
        <div className="py-10 text-center text-[13px] text-muted-foreground">
          暂无数据
        </div>
      ) : (
        <div className="h-52 w-full sm:h-60">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.58} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
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
                tickFormatter={(value) =>
                  formatMoney(Number(value), reportingCurrency).replace(
                    ".00",
                    ""
                  )
                }
              />
              <Tooltip
                content={<CustomTooltip reportingCurrency={reportingCurrency} />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar
                dataKey="total"
                radius={[4, 4, 0, 0]}
                fill={`url(#${BAR_GRADIENT_ID})`}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={
                      entry.total === maxVal && entry.total > 0
                        ? "#8b5cf6"
                        : `url(#${BAR_GRADIENT_ID})`
                    }
                    opacity={entry.total === maxVal ? 1 : 0.72}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
