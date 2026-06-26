import {
  Brain,
  Cloud,
  Code,
  FileText,
  MessageSquare,
  Music,
  PenTool,
  Play,
  Tv,
  type LucideIcon,
} from "lucide-react";
import {
  REPORTING_CURRENCY,
  convertMoney,
  getMissingRateCurrencies,
  type ConvertedMoney,
  type ExchangeRateMap,
} from "@/lib/exchange-rates";

export type BillingCycle = "monthly" | "yearly";

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: BillingCycle;
  category: string;
  start_date: string;
  next_billing_date: string;
  email_notifications_enabled: boolean;
  notify_days_before: number;
  last_notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export const categories = [
  "工作工具",
  "娱乐",
  "云服务",
  "学习",
  "生活",
  "设计",
] as const;

export type Category = (typeof categories)[number];

export const categoryColors: Record<Category, string> = {
  工作工具: "#6366f1",
  娱乐: "#ec4899",
  云服务: "#06b6d4",
  学习: "#f59e0b",
  生活: "#10b981",
  设计: "#a855f7",
};

const iconMap: Record<string, LucideIcon> = {
  Code,
  FileText,
  Music,
  Tv,
  Cloud,
  Brain,
  PenTool,
  Play,
  MessageSquare,
};

export const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CNY: "¥",
  JPY: "¥",
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || FileText;
}

export function getCurrencySymbol(code: string) {
  return currencySymbols[code] ?? `${code} `;
}

export function formatMoney(value: number, currency = REPORTING_CURRENCY) {
  return `${getCurrencySymbol(currency)}${value.toFixed(2)}`;
}

export function getMonthlyAmount(
  sub: Subscription,
  rates: ExchangeRateMap = {}
): ConvertedMoney {
  const monthly =
    sub.billing_cycle === "yearly"
      ? Number((sub.price / 12).toFixed(2))
      : sub.price;
  const converted = convertMoney(monthly, sub.currency, rates);

  return {
    amount: Number(converted.amount.toFixed(2)),
    missingRate: converted.missingRate,
  };
}

export function getTotalMonthly(subs: Subscription[], rates: ExchangeRateMap = {}) {
  return Number(
    subs.reduce((sum, sub) => sum + getMonthlyAmount(sub, rates).amount, 0).toFixed(2)
  );
}

export function getCategoryBreakdown(subs: Subscription[], rates: ExchangeRateMap = {}) {
  const map = new Map<string, number>();
  for (const sub of subs) {
    const monthly = getMonthlyAmount(sub, rates).amount;
    map.set(sub.category, (map.get(sub.category) || 0) + monthly);
  }

  return Array.from(map, ([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
    color: categoryColors[name as Category] || "#888",
  }));
}

export function getMissingSubscriptionRateCurrencies(
  subs: Subscription[],
  rates: ExchangeRateMap = {}
) {
  return getMissingRateCurrencies(
    subs.map((sub) => sub.currency),
    rates
  );
}
