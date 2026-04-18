import {
  Code,
  FileText,
  Music,
  Tv,
  Cloud,
  Brain,
  PenTool,
  Play,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

// ─── 类型定义 (对齐 Supabase subscriptions 表) ───

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
  created_at: string;
  updated_at: string;
}

// ─── 类别与颜色 ───

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
  "工作工具": "#6366f1",
  "娱乐": "#ec4899",
  "云服务": "#06b6d4",
  "学习": "#f59e0b",
  "生活": "#10b981",
  "设计": "#a855f7",
};

// ─── 图标映射 ───

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

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || FileText;
}

// ─── Mock Data (5 条) ───

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const NOW = "2026-04-18T00:00:00.000Z";

export const mockSubscriptions: Subscription[] = [
  {
    id: "a1b2c3d4-0001-0000-0000-000000000001",
    user_id: MOCK_USER_ID,
    name: "Netflix",
    price: 15.49,
    currency: "USD",
    billing_cycle: "monthly",
    category: "娱乐",
    start_date: "2024-06-01",
    next_billing_date: "2026-05-05",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "a1b2c3d4-0002-0000-0000-000000000002",
    user_id: MOCK_USER_ID,
    name: "ChatGPT Plus",
    price: 20.0,
    currency: "USD",
    billing_cycle: "monthly",
    category: "学习",
    start_date: "2025-01-15",
    next_billing_date: "2026-05-15",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "a1b2c3d4-0003-0000-0000-000000000003",
    user_id: MOCK_USER_ID,
    name: "iCloud+",
    price: 2.99,
    currency: "USD",
    billing_cycle: "monthly",
    category: "云服务",
    start_date: "2023-03-10",
    next_billing_date: "2026-04-22",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "a1b2c3d4-0004-0000-0000-000000000004",
    user_id: MOCK_USER_ID,
    name: "Spotify",
    price: 10.99,
    currency: "USD",
    billing_cycle: "monthly",
    category: "娱乐",
    start_date: "2022-11-01",
    next_billing_date: "2026-04-28",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "a1b2c3d4-0005-0000-0000-000000000005",
    user_id: MOCK_USER_ID,
    name: "GitHub Pro",
    price: 48.0,
    currency: "USD",
    billing_cycle: "yearly",
    category: "工作工具",
    start_date: "2024-01-01",
    next_billing_date: "2027-01-01",
    created_at: NOW,
    updated_at: NOW,
  },
];

// ─── 工具函数 ───

export function getMonthlyAmount(sub: Subscription): number {
  return sub.billing_cycle === "yearly"
    ? Number((sub.price / 12).toFixed(2))
    : sub.price;
}

export function getTotalMonthly(subs: Subscription[]): number {
  return subs.reduce((sum, s) => sum + getMonthlyAmount(s), 0);
}

export function getCategoryBreakdown(subs: Subscription[]) {
  const map = new Map<string, number>();
  for (const s of subs) {
    const monthly = getMonthlyAmount(s);
    map.set(s.category, (map.get(s.category) || 0) + monthly);
  }
  return Array.from(map, ([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
    color: categoryColors[name as Category] || "#888",
  }));
}
