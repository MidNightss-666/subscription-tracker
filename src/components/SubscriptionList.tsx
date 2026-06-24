"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  categoryColors,
  formatMoney,
  getIcon,
  type Subscription,
} from "@/lib/subscriptions";

const billingCycleLabel: Record<string, string> = {
  monthly: "月付",
  yearly: "年付",
};

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

function getDaysUntil(date: string) {
  return Math.ceil(
    (new Date(`${date}T00:00:00`).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#111114]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-[15px] font-semibold text-white">订阅列表</h2>
      </div>
      <div className="px-5 py-16 text-center text-[13px] text-zinc-500">
        暂无订阅，点击右上角“添加订阅”开始记录。
      </div>
    </div>
  );
}

export function SubscriptionList({
  refreshTrigger,
  onEdit,
  onData,
}: SubscriptionListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
  }, [refreshTrigger, onData]);

  async function handleDelete(subscription: Subscription) {
    const confirmed = window.confirm(`确定删除“${subscription.name}”吗？`);
    if (!confirmed) return;

    setDeletingId(subscription.id);
    const supabase = createBrowserClient();
    const { error: deleteError } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", subscription.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    const nextSubscriptions = subscriptions.filter(
      (item) => item.id !== subscription.id
    );
    setSubscriptions(nextSubscriptions);
    onData?.(nextSubscriptions);
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-[#111114]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-white">订阅列表</h2>
        </div>
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[13px]">加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-[#111114]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-white">订阅列表</h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="text-center text-[13px]">加载失败：{error}</span>
        </div>
      </div>
    );
  }

  if (subscriptions.length === 0) return <EmptyState />;

  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#111114]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-[15px] font-semibold text-white">订阅列表</h2>
        <span className="text-[13px] text-zinc-500">
          {subscriptions.length} 个项目
        </span>
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
              <TableHead className="pl-5 text-[12px] font-medium text-zinc-500">
                名称
              </TableHead>
              <TableHead className="text-[12px] font-medium text-zinc-500">
                类别
              </TableHead>
              <TableHead className="text-[12px] font-medium text-zinc-500">
                计费周期
              </TableHead>
              <TableHead className="text-[12px] font-medium text-zinc-500">
                下次扣费
              </TableHead>
              <TableHead className="text-right text-[12px] font-medium text-zinc-500">
                金额
              </TableHead>
              <TableHead className="w-24 pr-5 text-right" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {subscriptions.map((sub) => {
              const Icon = getIcon(serviceIcons[sub.name] || "FileText");
              const catColor =
                (categoryColors as Record<string, string>)[sub.category] ||
                "#888";
              const daysUntil = getDaysUntil(sub.next_billing_date);
              const isUrgent = daysUntil <= 7 && daysUntil >= 0;

              return (
                <TableRow
                  key={sub.id}
                  className="group border-b border-white/[0.04] hover:bg-white/[0.02]"
                >
                  <TableCell className="py-3 pl-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${catColor}18` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: catColor }} />
                      </div>
                      <span className="text-[14px] font-medium text-white">
                        {sub.name}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[12px] font-medium"
                      style={{
                        color: catColor,
                        backgroundColor: `${catColor}18`,
                      }}
                    >
                      {sub.category}
                    </span>
                  </TableCell>

                  <TableCell className="text-[13px] text-zinc-400">
                    {billingCycleLabel[sub.billing_cycle] ?? sub.billing_cycle}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 shrink-0 text-zinc-600" />
                      <span
                        className={`text-[13px] ${
                          isUrgent ? "text-amber-400" : "text-zinc-400"
                        }`}
                      >
                        {sub.next_billing_date}
                      </span>
                      {isUrgent && (
                        <span className="whitespace-nowrap text-[10px] font-medium text-amber-400/70">
                          {daysUntil === 0 ? "今天" : `${daysUntil} 天后`}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="tabular-nums text-[14px] font-medium text-white">
                      {formatMoney(sub.price, sub.currency)}
                    </span>
                  </TableCell>

                  <TableCell className="pr-5">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(sub)}
                        className="text-zinc-500 hover:bg-white/[0.06] hover:text-white"
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(sub)}
                        disabled={deletingId === sub.id}
                        className="text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                        title="删除"
                      >
                        {deletingId === sub.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y divide-white/[0.06] md:hidden">
        {subscriptions.map((sub) => {
          const Icon = getIcon(serviceIcons[sub.name] || "FileText");
          const catColor =
            (categoryColors as Record<string, string>)[sub.category] || "#888";
          const daysUntil = getDaysUntil(sub.next_billing_date);
          const isUrgent = daysUntil <= 7 && daysUntil >= 0;

          return (
            <div key={sub.id} className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${catColor}18` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: catColor }} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-white">
                      {sub.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-zinc-500">
                      <span>{sub.category}</span>
                      <span>·</span>
                      <span>{billingCycleLabel[sub.billing_cycle]}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-[14px] font-semibold tabular-nums text-white">
                  {formatMoney(sub.price, sub.currency)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[13px] text-zinc-400">
                  <Calendar className="h-3 w-3 text-zinc-600" />
                  <span className={isUrgent ? "text-amber-400" : ""}>
                    {sub.next_billing_date}
                  </span>
                  {isUrgent && (
                    <span className="text-[10px] text-amber-400/70">
                      {daysUntil === 0 ? "今天" : `${daysUntil} 天后`}
                    </span>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(sub)}
                    className="text-zinc-500 hover:bg-white/[0.06] hover:text-white"
                    title="编辑"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(sub)}
                    disabled={deletingId === sub.id}
                    className="text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                    title="删除"
                  >
                    {deletingId === sub.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

