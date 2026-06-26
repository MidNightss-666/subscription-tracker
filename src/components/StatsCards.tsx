"use client";

import { ArrowDownRight, ArrowUpRight, CreditCard, TrendingUp } from "lucide-react";
import type { Subscription } from "@/lib/subscriptions";
import { formatMoney } from "@/lib/subscriptions";
import { useSubscriptionStats } from "@/hooks/useSubscriptionStats";

interface StatsCardsProps {
  subscriptions?: Subscription[];
}

export function StatsCards({ subscriptions = [] }: StatsCardsProps) {
  const {
    reportingCurrency,
    monthlyTotal,
    yearlyTotal,
    currentMonthTotal,
    previousMonthTotal,
    growthRate,
    missingRateCurrencies,
  } = useSubscriptionStats(subscriptions);
  const count = subscriptions.length;
  const GrowthIcon = growthRate >= 0 ? ArrowUpRight : ArrowDownRight;

  const stats = [
    {
      label: "月均支出",
      value: formatMoney(monthlyTotal, reportingCurrency),
      sub: `${count} 个订阅折算后的月成本`,
      icon: TrendingUp,
      accent: "text-emerald-400",
    },
    {
      label: "年化支出",
      value: formatMoney(yearlyTotal, reportingCurrency),
      sub: "按当前订阅组合估算",
      icon: CreditCard,
      accent: "text-sky-400",
    },
    {
      label: "本月环比",
      value: `${growthRate >= 0 ? "+" : ""}${growthRate}%`,
      sub: `${formatMoney(previousMonthTotal, reportingCurrency)} → ${formatMoney(currentMonthTotal, reportingCurrency)}`,
      icon: GrowthIcon,
      accent: growthRate > 0 ? "text-amber-400" : "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-3">
      {missingRateCurrencies.length > 0 ? (
        <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
          Missing exchange rates for {missingRateCurrencies.join(", ")}; using
          original amounts in {reportingCurrency} totals.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative rounded-lg border border-border/70 bg-card/75 p-5 shadow-xl shadow-black/5 backdrop-blur-xl transition-all hover:border-border hover:bg-card/90"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[12px] font-medium tracking-wide text-muted-foreground">
                {stat.label}
              </span>
              <stat.icon className={`h-4 w-4 ${stat.accent} opacity-70`} />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              {stat.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
