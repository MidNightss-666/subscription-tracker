"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Activity, LogOut } from "lucide-react";
import { StatsCards } from "@/components/StatsCards";
import { SubscriptionList } from "@/components/SubscriptionList";
import { CategoryChart } from "@/components/CategoryChart";
import { ForecastChart } from "@/components/ForecastChart";
import { AddSubscriptionDialog } from "@/components/AddSubscriptionDialog";
import { EditSubscriptionDialog } from "@/components/EditSubscriptionDialog";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Subscription } from "@/lib/subscriptions";

export default function Home() {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const handleSuccess = useCallback(() => {
    setRefreshTrigger((k) => k + 1);
  }, []);

  const handleEdit = useCallback((sub: Subscription) => {
    setEditSub(sub);
    setEditOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-white tracking-tight">
              SubTrack
            </span>
          </div>
          <div className="flex items-center gap-3">
            <AddSubscriptionDialog onSuccess={handleSuccess} />
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight mb-1">
            订阅看板
          </h1>
          <p className="text-[14px] text-zinc-500">
            管理你的所有订阅服务，掌控每月支出
          </p>
        </div>

        <StatsCards subscriptions={subscriptions} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SubscriptionList
              refreshTrigger={refreshTrigger}
              onEdit={handleEdit}
              onData={setSubscriptions}
            />
          </div>
          <div className="space-y-6">
            <CategoryChart subscriptions={subscriptions} />
            <ForecastChart subscriptions={subscriptions} />
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <EditSubscriptionDialog
        subscription={editSub}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-6 mt-12">
        <p className="text-center text-[12px] text-zinc-600">
          SubTrack — 个人订阅管理看板
        </p>
      </footer>
    </div>
  );
}
