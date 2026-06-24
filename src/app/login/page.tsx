"use client";

import { useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("123123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const supabase = createBrowserClient();

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage("注册成功，请查收邮件确认后登录。");
          setIsSignUp(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "h-10 rounded-lg border-white/[0.08] bg-[#0a0a0c] text-[14px] text-white placeholder:text-zinc-600";
  const labelCls = "text-[13px] text-zinc-400";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            SubTrack
          </span>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#111114] p-6">
          <h1 className="mb-1 text-[16px] font-semibold text-white">
            {isSignUp ? "创建账号" : "登录"}
          </h1>
          <p className="mb-6 text-[13px] text-zinc-500">
            {isSignUp
              ? "注册后即可开始管理你的订阅。"
              : "登录你的账号继续使用。"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className={labelCls}>
                邮箱
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                className={inputCls}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={labelCls}>
                密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 6 位"
                className={inputCls}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-400/10 px-3 py-2 text-[13px] text-red-400">
                {error}
              </p>
            )}

            {message && (
              <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-[13px] text-emerald-400">
                {message}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full gap-2 rounded-lg bg-white text-[14px] font-medium text-black hover:bg-zinc-200"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignUp ? "注册" : "登录"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="text-[13px] text-zinc-500 transition-colors hover:text-white"
            >
              {isSignUp ? "已有账号？登录" : "没有账号？注册"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
