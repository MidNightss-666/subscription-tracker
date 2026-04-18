import { useMemo } from "react";
import type { Subscription } from "@/lib/subscriptions";

// 深色系配色：紫、青、靛蓝为主
const CHART_COLORS = [
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#6366f1", // indigo-500
  "#a78bfa", // violet-400
  "#22d3ee", // cyan-400
  "#818cf8", // indigo-400
];

function getMonthlyAmount(sub: Subscription): number {
  return sub.billing_cycle === "yearly" ? sub.price / 12 : sub.price;
}

function getNextBillingDates(sub: Subscription, count: number): string[] {
  const dates: string[] = [];
  const date = new Date(sub.next_billing_date + "T00:00:00");
  for (let i = 0; i < count; i++) {
    dates.push(date.toISOString().slice(0, 7)); // "YYYY-MM"
    if (sub.billing_cycle === "monthly") {
      date.setMonth(date.getMonth() + 1);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
  }
  return dates;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export interface ForecastData {
  month: string;   // "2026-05"
  label: string;   // "5月"
  total: number;
}

export interface SubscriptionStats {
  monthlyTotal: number;
  yearlyTotal: number;
  growthRate: number;
  categoryBreakdown: CategoryData[];
  monthlyForecast: ForecastData[];
}

export function useSubscriptionStats(
  subscriptions: Subscription[]
): SubscriptionStats {
  return useMemo(() => {
    let monthlyTotal = 0;
    const categoryMap = new Map<string, number>();

    for (const sub of subscriptions) {
      const monthly = getMonthlyAmount(sub);
      monthlyTotal += monthly;
      categoryMap.set(
        sub.category,
        (categoryMap.get(sub.category) || 0) + monthly
      );
    }

    const yearlyTotal = monthlyTotal * 12;

    // Mock: 假设上个月总支出比当前少 8.5%
    const lastMonthTotal = monthlyTotal / (1 + 0.085);
    const growthRate =
      lastMonthTotal > 0
        ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0;

    const categoryBreakdown: CategoryData[] = Array.from(
      categoryMap,
      ([name, value], i) => ({
        name,
        value: Number(value.toFixed(2)),
        color: CHART_COLORS[i % CHART_COLORS.length],
      })
    );

    // 未来 6 个月预期支出
    const FORECAST_MONTHS = 6;
    const monthTotals = new Map<string, number>();
    for (const sub of subscriptions) {
      const dates = getNextBillingDates(sub, FORECAST_MONTHS);
      const amount = sub.price;
      for (const ym of dates) {
        monthTotals.set(ym, (monthTotals.get(ym) || 0) + amount);
      }
    }

    const sortedMonths = Array.from(monthTotals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, FORECAST_MONTHS);

    const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月",
                        "7月", "8月", "9月", "10月", "11月", "12月"];

    const monthlyForecast: ForecastData[] = sortedMonths.map(
      ([month, total]) => ({
        month,
        label: monthNames[parseInt(month.split("-")[1], 10) - 1],
        total: Number(total.toFixed(2)),
      })
    );

    return {
      monthlyTotal: Number(monthlyTotal.toFixed(2)),
      yearlyTotal: Number(yearlyTotal.toFixed(2)),
      growthRate: Number(growthRate.toFixed(1)),
      categoryBreakdown,
      monthlyForecast,
    };
  }, [subscriptions]);
}
