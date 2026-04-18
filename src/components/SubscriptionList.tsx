"use client";

import { useEffect, useState } from "react";
import { Calendar, Loader2, AlertCircle, MoreHorizontal } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  type Subscription,
  getIcon,
  categoryColors,
} from "@/lib/subscriptions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CNY: "¥",
  JPY: "¥",
};

function currencySymbol(code: string) {
  return currencySymbols[code] ?? `${code} `;
}

const billingCycleLabel: Record<string, string> = {
  monthly: "月付 · Monthly",
  yearly: "年付 · Yearly",
};

// 根据服务名推断图标
const serviceIcons: Record<string, string> = {
  Netflix: "Tv",
  "ChatGPT Plus": "MessageSquare",
  "iCloud+": "Cloud",
  Spotify: "Music",
  "GitHub Pro": "Code",
};

interface SubscriptionListProps {
  refreshTrigger: number;
  onEdit: (subscription: Subscription) => void;
  onData?: (data: Subscription[]) => void;
}

export function SubscriptionList({
  refreshTrigger,
  onEdit,
  onData,
}: SubscriptionListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient();

    async function fetchSubscriptions() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("subscriptions")
        .select("*")
        .order("next_billing_date", { ascending: true });

      if (cancelled) return;

      if (err) {
        setError(err.message);
      } else {
        setError(null);
        const subs = data ?? [];
        setSubscriptions(subs);
        onData?.(subs);
      }
      setLoading(false);
    }

    fetchSubscriptions();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#111114]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-white">订阅列表</h2>
        </div>
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[13px]">加载中…</span>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-[#111114]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-white">订阅列表</h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="text-[13px]">加载失败：{error}</span>
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (subscriptions.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#111114]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-white">订阅列表</h2>
        </div>
        <div className="py-16 text-center text-[13px] text-zinc-500">
          暂无订阅，点击右上角「添加订阅」开始记录
        </div>
      </div>
    );
  }

  // ── Data ──
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111114] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-[15px] font-semibold text-white">订阅列表</h2>
        <span className="text-[13px] text-zinc-500">
          {subscriptions.length} 个项目
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-[12px] text-zinc-500 font-medium pl-5">
              名称
            </TableHead>
            <TableHead className="text-[12px] text-zinc-500 font-medium">
              类别
            </TableHead>
            <TableHead className="text-[12px] text-zinc-500 font-medium">
              计费周期
            </TableHead>
            <TableHead className="text-[12px] text-zinc-500 font-medium">
              下次扣费
            </TableHead>
            <TableHead className="text-[12px] text-zinc-500 font-medium text-right pr-5">
              金额
            </TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {subscriptions.map((sub) => {
            const Icon = getIcon(serviceIcons[sub.name] || "FileText");
            const catColor =
              (categoryColors as Record<string, string>)[sub.category] ||
              "#888";

            const daysUntil = Math.ceil(
              (new Date(sub.next_billing_date).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            );
            const isUrgent = daysUntil <= 7 && daysUntil >= 0;

            return (
              <TableRow
                key={sub.id}
                className="group border-b border-white/[0.04] hover:bg-white/[0.02]"
              >
                {/* 名称 + 图标 */}
                <TableCell className="pl-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                      style={{ backgroundColor: `${catColor}18` }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: catColor }}
                      />
                    </div>
                    <span className="text-[14px] font-medium text-white">
                      {sub.name}
                    </span>
                  </div>
                </TableCell>

                {/* 类别 */}
                <TableCell>
                  <span
                    className="inline-block text-[12px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      color: catColor,
                      backgroundColor: `${catColor}18`,
                    }}
                  >
                    {sub.category}
                  </span>
                </TableCell>

                {/* 计费周期 */}
                <TableCell className="text-[13px] text-zinc-400">
                  {billingCycleLabel[sub.billing_cycle] ?? sub.billing_cycle}
                </TableCell>

                {/* 下次扣费日期 */}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-zinc-600 shrink-0" />
                    <span
                      className={`text-[13px] ${
                        isUrgent ? "text-amber-400" : "text-zinc-400"
                      }`}
                    >
                      {sub.next_billing_date}
                    </span>
                    {isUrgent && (
                      <span className="text-[10px] text-amber-400/70 font-medium whitespace-nowrap">
                        {daysUntil}天后
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* 金额 */}
                <TableCell className="text-right pr-5">
                  <span className="text-[14px] font-medium text-white tabular-nums">
                    {currencySymbol(sub.currency)}
                    {sub.price.toFixed(2)}
                  </span>
                </TableCell>

                {/* 操作 */}
                <TableCell>
                  <button
                    onClick={() => onEdit(sub)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/[0.06]"
                  >
                    <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
