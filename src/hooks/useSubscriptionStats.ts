import { useMemo } from "react";
import {
  getCategoryBreakdown,
  getMonthlyAmount,
  type Subscription,
} from "@/lib/subscriptions";

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export interface ForecastData {
  month: string;
  label: string;
  total: number;
}

export interface SubscriptionStats {
  monthlyTotal: number;
  yearlyTotal: number;
  currentMonthTotal: number;
  previousMonthTotal: number;
  growthRate: number;
  categoryBreakdown: CategoryData[];
  monthlyForecast: ForecastData[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addCycle(date: Date, cycle: Subscription["billing_cycle"]) {
  const next = new Date(date);
  if (cycle === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function monthLabel(date: Date) {
  return `${date.getMonth() + 1}月`;
}

function getFirstBillingOnOrAfter(sub: Subscription, target: Date) {
  let cursor = parseLocalDate(sub.next_billing_date);

  while (cursor < target) {
    cursor = addCycle(cursor, sub.billing_cycle);
  }

  return cursor;
}

function getFirstRecurringDateOnOrAfter(
  startDate: Date,
  cycle: Subscription["billing_cycle"],
  target: Date
) {
  let cursor = new Date(startDate);

  while (cursor < target) {
    cursor = addCycle(cursor, cycle);
  }

  return cursor;
}

function getScheduledTotalForMonth(
  subscriptions: Subscription[],
  monthStart: Date
) {
  const monthEnd = endOfMonth(monthStart);

  return Number(
    subscriptions
      .reduce((sum, sub) => {
        const startDate = parseLocalDate(sub.start_date);
        if (startDate > monthEnd) return sum;

        const firstBilling = getFirstRecurringDateOnOrAfter(
          startDate,
          sub.billing_cycle,
          monthStart
        );
        return firstBilling <= monthEnd ? sum + sub.price : sum;
      }, 0)
      .toFixed(2)
  );
}

function getForecast(subscriptions: Subscription[], months = 6): ForecastData[] {
  const today = new Date();
  const rangeStart = startOfMonth(today);
  const monthStarts = Array.from(
    { length: months },
    (_, index) => new Date(today.getFullYear(), today.getMonth() + index, 1)
  );
  const rangeEnd = endOfMonth(monthStarts[monthStarts.length - 1]);
  const monthTotals = new Map(monthStarts.map((date) => [monthKey(date), 0]));

  for (const sub of subscriptions) {
    let billingDate = getFirstBillingOnOrAfter(sub, rangeStart);

    while (billingDate <= rangeEnd) {
      const key = monthKey(billingDate);
      monthTotals.set(key, (monthTotals.get(key) || 0) + sub.price);
      billingDate = addCycle(billingDate, sub.billing_cycle);

      // Defensive guard against invalid dates causing an endless loop.
      if (Number.isNaN(billingDate.getTime())) break;
      if ((billingDate.getTime() - rangeStart.getTime()) / MS_PER_DAY > 3700) {
        break;
      }
    }
  }

  return monthStarts.map((date) => {
    const key = monthKey(date);
    return {
      month: key,
      label: monthLabel(date),
      total: Number((monthTotals.get(key) || 0).toFixed(2)),
    };
  });
}

export function useSubscriptionStats(
  subscriptions: Subscription[]
): SubscriptionStats {
  return useMemo(() => {
    const monthlyTotal = Number(
      subscriptions
        .reduce((sum, sub) => sum + getMonthlyAmount(sub), 0)
        .toFixed(2)
    );
    const yearlyTotal = Number((monthlyTotal * 12).toFixed(2));
    const currentMonth = startOfMonth(new Date());
    const previousMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );
    const currentMonthTotal = getScheduledTotalForMonth(
      subscriptions,
      currentMonth
    );
    const previousMonthTotal = getScheduledTotalForMonth(
      subscriptions,
      previousMonth
    );
    const growthRate =
      previousMonthTotal > 0
        ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
        : currentMonthTotal > 0
          ? 100
          : 0;

    return {
      monthlyTotal,
      yearlyTotal,
      currentMonthTotal,
      previousMonthTotal,
      growthRate: Number(growthRate.toFixed(1)),
      categoryBreakdown: getCategoryBreakdown(subscriptions),
      monthlyForecast: getForecast(subscriptions),
    };
  }, [subscriptions]);
}
