"use client";

import { useCallback, useState } from "react";
import { Activity, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { AddSubscriptionDialog } from "@/components/AddSubscriptionDialog";
import { CategoryChart } from "@/components/CategoryChart";
import { EditSubscriptionDialog } from "@/components/EditSubscriptionDialog";
import { FluidBackground } from "@/components/FluidBackground";
import { ForecastChart } from "@/components/ForecastChart";
import { StatsCards } from "@/components/StatsCards";
import { SubscriptionList } from "@/components/SubscriptionList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Subscription } from "@/lib/subscriptions";

export default function Home() {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const handleSuccess = useCallback(() => {
    setRefreshTrigger((key) => key + 1);
  }, []);

  const handleEdit = useCallback((subscription: Subscription) => {
    setEditSub(subscription);
    setEditOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FluidBackground />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/55 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              SubTrack
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <AddSubscriptionDialog onSuccess={handleSuccess} />
            <button
              onClick={handleLogout}
              className="rounded-lg border border-border/60 bg-card/55 p-2 text-muted-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-card/80 hover:text-foreground"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <h1 className="mb-1 text-xl font-semibold tracking-tight text-foreground">
            订阅看板
          </h1>
          <p className="text-[14px] text-muted-foreground">
            管理你的所有订阅服务，掌握每月支出和未来扣费节奏。
          </p>
        </div>

        <StatsCards subscriptions={subscriptions} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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

      <EditSubscriptionDialog
        subscription={editSub}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleSuccess}
      />

      <footer className="relative z-10 mt-12 border-t border-border/40 py-6">
        <p className="text-center text-[12px] text-muted-foreground">
          SubTrack · 个人订阅管理看板
        </p>
      </footer>
    </div>
  );
}
