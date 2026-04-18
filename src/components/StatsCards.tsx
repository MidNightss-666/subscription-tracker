"use client";

import { CreditCard, TrendingUp, ArrowUpRight } from "lucide-react";
import type { Subscription } from "@/lib/subscriptions";
import { useSubscriptionStats } from "@/hooks/useSubscriptionStats";

interface StatsCardsProps {
  subscriptions?: Subscription[];
}

export function StatsCards({ subscriptions = [] }: StatsCardsProps) {
  const { monthlyTotal, yearlyTotal, growthRate } =
    useSubscriptionStats(subscriptions);
  const count = subscriptions.length;

  const stats = [
    {
      label: "每月总支出",
      value: `$${monthlyTotal.toFixed(2)}`,
      sub: "所有订阅合计",
      icon: TrendingUp,
      accent: "text-emerald-400",
    },
    {
      label: "每年总支出",
      value: `$${yearlyTotal.toFixed(2)}`,
      sub: `${count} 个项目`,
      icon: CreditCard,
      accent: "text-blue-400",
    },
    {
      label: "环比增长",
      value: `${growthRate >= 0 ? "+" : ""}${growthRate}%`,
      sub: "较上月",
      icon: ArrowUpRight,
      accent: growthRate >= 0 ? "text-amber-400" : "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="group relative rounded-xl border border-white/[0.06] bg-[#111114] p-5 transition-all hover:border-white/[0.12] hover:bg-[#15151a]"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] text-zinc-500 font-medium tracking-wide uppercase">
              {s.label}
            </span>
            <s.icon className={`h-4 w-4 ${s.accent} opacity-60`} />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-white">
            {s.value}
          </div>
          <div className="text-[13px] text-zinc-500 mt-1">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
