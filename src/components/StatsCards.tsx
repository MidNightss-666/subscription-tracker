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
    monthlyTotal,
    yearlyTotal,
    currentMonthTotal,
    previousMonthTotal,
    growthRate,
  } = useSubscriptionStats(subscriptions);
  const count = subscriptions.length;
  const GrowthIcon = growthRate >= 0 ? ArrowUpRight : ArrowDownRight;

  const stats = [
    {
      label: "月均支出",
      value: formatMoney(monthlyTotal),
      sub: `${count} 个订阅折算后的月成本`,
      icon: TrendingUp,
      accent: "text-emerald-400",
    },
    {
      label: "年化支出",
      value: formatMoney(yearlyTotal),
      sub: "按当前订阅组合估算",
      icon: CreditCard,
      accent: "text-sky-400",
    },
    {
      label: "本月环比",
      value: `${growthRate >= 0 ? "+" : ""}${growthRate}%`,
      sub: `${formatMoney(previousMonthTotal)} → ${formatMoney(currentMonthTotal)}`,
      icon: GrowthIcon,
      accent: growthRate > 0 ? "text-amber-400" : "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative rounded-lg border border-white/[0.06] bg-[#111114] p-5 transition-all hover:border-white/[0.12] hover:bg-[#15151a]"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[12px] font-medium tracking-wide text-zinc-500">
              {stat.label}
            </span>
            <stat.icon className={`h-4 w-4 ${stat.accent} opacity-70`} />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-white">
            {stat.value}
          </div>
          <div className="mt-1 text-[13px] text-zinc-500">{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}

