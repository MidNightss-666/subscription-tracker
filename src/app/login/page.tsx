"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("123123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        } else {
          setMessage("注册成功，请查收邮件确认后登录");
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch {
      setError("操作失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600 h-10 text-[14px] rounded-lg";
  const labelCls = "text-zinc-400 text-[13px]";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">
            SubTrack
          </span>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-white/[0.06] bg-[#111114] p-6">
          <h1 className="text-[16px] font-semibold text-white mb-1">
            {isSignUp ? "创建账号" : "登录"}
          </h1>
          <p className="text-[13px] text-zinc-500 mb-6">
            {isSignUp ? "注册新账号以开始管理订阅" : "登录你的账号继续使用"}
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
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="至少6位"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {message && (
              <p className="text-[13px] text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 font-medium text-[14px] h-10 rounded-lg gap-2"
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
              className="text-[13px] text-zinc-500 hover:text-white transition-colors"
            >
              {isSignUp ? "已有账号？登录" : "没有账号？注册"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
