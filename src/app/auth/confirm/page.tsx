"use client";

import { Suspense, useEffect } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function confirmEmail() {
      const supabase = createBrowserClient();
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const next = searchParams.get("next") ?? "/";

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (tokenHash && type) {
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      router.replace(session ? next : "/login");
      router.refresh();
    }

    confirmEmail();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#111114] px-4 py-3 text-[14px] text-zinc-300">
        <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
        正在验证邮箱...
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <AuthConfirmContent />
    </Suspense>
  );
}

