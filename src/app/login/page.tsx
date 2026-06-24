"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FluidBackground } from "@/components/FluidBackground";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@/lib/supabase/client";

const DEFAULT_EMAIL = "test@test.com";
const DEFAULT_PASSWORD = "123123";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CaptchaChallenge = {
  left: number;
  right: number;
  operator: "+" | "-" | "*" | "/";
  answer: number;
};

type EmailCheckState =
  | "idle"
  | "checking"
  | "available"
  | "registered"
  | "unavailable";

function createCaptcha(): CaptchaChallenge {
  const operator = ["+", "-", "*", "/"][
    Math.floor(Math.random() * 4)
  ] as CaptchaChallenge["operator"];

  if (operator === "+") {
    const left = Math.floor(Math.random() * 20) + 1;
    const right = Math.floor(Math.random() * 20) + 1;
    return { left, right, operator, answer: left + right };
  }

  if (operator === "-") {
    const answer = Math.floor(Math.random() * 20) + 1;
    const right = Math.floor(Math.random() * 20) + 1;
    return { left: answer + right, right, operator, answer };
  }

  if (operator === "*") {
    const left = Math.floor(Math.random() * 9) + 1;
    const right = Math.floor(Math.random() * 9) + 1;
    return { left, right, operator, answer: left * right };
  }

  const right = Math.floor(Math.random() * 9) + 1;
  const answer = Math.floor(Math.random() * 9) + 1;
  return { left: right * answer, right, operator, answer };
}

function getEmailRedirectTo() {
  return `${window.location.origin}/auth/confirm?next=/`;
}

function LoginForm() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaChallenge>(() =>
    createCaptcha()
  );
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [emailCheckState, setEmailCheckState] =
    useState<EmailCheckState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const normalizedEmail = email.trim();
  const hasEmailInput = normalizedEmail.length > 0;
  const isEmailValid = EMAIL_PATTERN.test(normalizedEmail);
  const hasCaptchaInput = captchaAnswer.trim().length > 0;
  const isCaptchaValid = Number(captchaAnswer) === captcha.answer;
  const isPasswordLongEnough = password.length >= 6;
  const hasConfirmPasswordInput = confirmPassword.length > 0;
  const doPasswordsMatch = password === confirmPassword;
  const emailAlreadyRegistered = emailCheckState === "registered";
  const canSubmitSignUp =
    isEmailValid &&
    isPasswordLongEnough &&
    hasConfirmPasswordInput &&
    doPasswordsMatch &&
    isCaptchaValid &&
    !emailAlreadyRegistered &&
    !loading;

  useEffect(() => {
    if (!isSignUp || !isEmailValid) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setEmailCheckState("checking");

      try {
        const supabase = createBrowserClient();
        const { data, error: checkError } = await supabase.rpc(
          "is_email_registered",
          { p_email: normalizedEmail }
        );

        if (cancelled) return;

        if (checkError) {
          setEmailCheckState("unavailable");
          return;
        }

        setEmailCheckState(data ? "registered" : "available");
      } catch {
        if (!cancelled) setEmailCheckState("unavailable");
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isEmailValid, isSignUp, normalizedEmail]);

  const emailState = useMemo(() => {
    if (!isSignUp || !hasEmailInput) return null;
    if (!isEmailValid) {
      return { text: "请输入有效的邮箱地址", className: "text-red-400" };
    }
    if (emailCheckState === "checking") {
      return { text: "正在检查邮箱...", className: "text-muted-foreground" };
    }
    if (emailCheckState === "registered") {
      return { text: "该邮箱已注册，请直接登录。", className: "text-red-400" };
    }
    if (emailCheckState === "available") {
      return { text: "该邮箱可用于注册", className: "text-emerald-400" };
    }
    return null;
  }, [emailCheckState, hasEmailInput, isEmailValid, isSignUp]);

  const passwordState = useMemo(() => {
    if (!isSignUp || password.length === 0 || isPasswordLongEnough) return null;
    return { text: "密码至少需要 6 位", className: "text-red-400" };
  }, [isPasswordLongEnough, isSignUp, password.length]);

  const confirmPasswordState = useMemo(() => {
    if (!isSignUp || !hasConfirmPasswordInput || doPasswordsMatch) return null;
    return { text: "两次输入的密码不一致", className: "text-red-400" };
  }, [doPasswordsMatch, hasConfirmPasswordInput, isSignUp]);

  const captchaState = useMemo(() => {
    if (!isSignUp || !hasCaptchaInput || isCaptchaValid) return null;
    return { text: "验证码不正确", className: "text-red-400" };
  }, [hasCaptchaInput, isCaptchaValid, isSignUp]);

  function resetCaptcha() {
    setCaptcha(createCaptcha());
    setCaptchaAnswer("");
  }

  function switchMode() {
    const nextIsSignUp = !isSignUp;
    setIsSignUp(nextIsSignUp);
    setError(null);
    setMessage(null);
    setEmailCheckState("idle");
    setShowPassword(false);
    setShowConfirmPassword(false);
    resetCaptcha();

    if (nextIsSignUp) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } else {
      setEmail(DEFAULT_EMAIL);
      setPassword(DEFAULT_PASSWORD);
      setConfirmPassword("");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (isSignUp) {
      if (!isEmailValid) {
        setError("请输入有效的邮箱地址。");
        return;
      }

      if (emailAlreadyRegistered) {
        setError("该邮箱已注册，请直接登录。");
        return;
      }

      if (!doPasswordsMatch) {
        setError("两次输入的密码不一致。");
        return;
      }

      if (!isCaptchaValid) {
        setError("验证码不正确，请重新输入。");
        resetCaptcha();
        return;
      }
    }

    setLoading(true);

    try {
      const supabase = createBrowserClient();

      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: getEmailRedirectTo(),
          },
        });

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes("registered")) {
            setEmailCheckState("registered");
          }
          setError(signUpError.message);
        } else if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setMessage("确认邮件已发送，请打开邮箱点击确认链接激活账户。");
          setIsSignUp(false);
          setEmail(DEFAULT_EMAIL);
          setPassword(DEFAULT_PASSWORD);
          setConfirmPassword("");
          setEmailCheckState("idle");
          setShowPassword(false);
          setShowConfirmPassword(false);
          resetCaptcha();
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
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
    "h-10 rounded-lg border-border/70 bg-background/45 text-[14px] text-foreground shadow-sm backdrop-blur-xl placeholder:text-muted-foreground";
  const labelCls = "text-[13px] text-muted-foreground";
  const passwordToggleCls =
    "absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <FluidBackground />
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-[390px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            SubTrack
          </span>
        </div>

        <div className="rounded-lg border border-border/70 bg-card/75 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <h1 className="mb-1 text-[16px] font-semibold text-foreground">
            {isSignUp ? "创建账号" : "登录"}
          </h1>
          <p className="mb-6 text-[13px] text-muted-foreground">
            {isSignUp
              ? "注册后会发送确认邮件，点击邮件链接即可激活账户。"
              : "登录你的账号继续管理订阅。"}
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
                className={`${inputCls} ${
                  isSignUp && hasEmailInput
                    ? isEmailValid && !emailAlreadyRegistered
                      ? "border-emerald-400/50 focus-visible:border-emerald-400"
                      : "border-red-400/60 focus-visible:border-red-400"
                    : ""
                }`}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailCheckState("idle");
                }}
                aria-invalid={
                  isSignUp &&
                  hasEmailInput &&
                  (!isEmailValid || emailAlreadyRegistered)
                }
                required
              />
              {emailState && (
                <p className={`text-[12px] ${emailState.className}`}>
                  {emailState.text}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={labelCls}>
                密码
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="至少 6 位"
                  className={`${inputCls} pr-16 ${
                    isSignUp && password.length > 0 && !isPasswordLongEnough
                      ? "border-red-400/60 focus-visible:border-red-400"
                      : ""
                  } ${
                    isSignUp && password.length > 0 && isPasswordLongEnough
                      ? "border-emerald-400/50 focus-visible:border-emerald-400"
                      : ""
                  }`}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={
                    isSignUp && password.length > 0 && !isPasswordLongEnough
                  }
                  required
                  minLength={6}
                />
                {isSignUp && password.length > 0 && isPasswordLongEnough && (
                  <Check className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                )}
                <button
                  type="button"
                  className={passwordToggleCls}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  title={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordState && (
                <p className={`text-[12px] ${passwordState.className}`}>
                  {passwordState.text}
                </p>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className={labelCls}>
                  确认密码
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="再次输入密码"
                    className={`${inputCls} pr-16 ${
                      hasConfirmPasswordInput && !doPasswordsMatch
                        ? "border-red-400/60 focus-visible:border-red-400"
                        : ""
                    } ${
                      hasConfirmPasswordInput && doPasswordsMatch
                        ? "border-emerald-400/50 focus-visible:border-emerald-400"
                        : ""
                    }`}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    aria-invalid={hasConfirmPasswordInput && !doPasswordsMatch}
                    required
                    minLength={6}
                  />
                  {hasConfirmPasswordInput && doPasswordsMatch && (
                    <Check className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  )}
                  <button
                    type="button"
                    className={passwordToggleCls}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={
                      showConfirmPassword ? "隐藏确认密码" : "显示确认密码"
                    }
                    title={showConfirmPassword ? "隐藏确认密码" : "显示确认密码"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPasswordState && (
                  <p
                    className={`text-[12px] ${confirmPasswordState.className}`}
                  >
                    {confirmPasswordState.text}
                  </p>
                )}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="captcha" className={labelCls}>
                    验证码
                  </Label>
                  <button
                    type="button"
                    onClick={resetCaptcha}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <RefreshCw className="h-3 w-3" />
                    换一题
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_96px] gap-3">
                  <div className="flex h-10 items-center justify-center rounded-lg border border-border/70 bg-background/45 text-[14px] font-medium text-foreground shadow-sm backdrop-blur-xl">
                    {captcha.left} {captcha.operator} {captcha.right} = ?
                  </div>
                  <div className="relative">
                    <Input
                      id="captcha"
                      type="number"
                      inputMode="numeric"
                      placeholder="答案"
                      className={`${inputCls} no-number-spinner text-center ${
                        hasCaptchaInput ? "pr-8" : ""
                      } ${
                        hasCaptchaInput && !isCaptchaValid
                          ? "border-red-400/60 focus-visible:border-red-400"
                          : ""
                      } ${
                        hasCaptchaInput && isCaptchaValid
                          ? "border-emerald-400/50 focus-visible:border-emerald-400"
                          : ""
                      }`}
                      value={captchaAnswer}
                      onChange={(event) => setCaptchaAnswer(event.target.value)}
                      aria-invalid={hasCaptchaInput && !isCaptchaValid}
                      required
                    />
                    {hasCaptchaInput && isCaptchaValid && (
                      <Check className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                    )}
                  </div>
                </div>
                {captchaState && (
                  <p className={`text-[12px] ${captchaState.className}`}>
                    {captchaState.text}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-400/10 px-3 py-2 text-[13px] text-red-400">
                {error}
              </p>
            )}

            {message && (
              <div className="flex gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-[13px] text-emerald-400">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (isSignUp && !canSubmitSignUp)}
              className="h-10 w-full gap-2 rounded-lg bg-primary text-[14px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignUp ? "发送确认邮件" : "登录"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {isSignUp ? "已有账号？登录" : "没有账号？注册"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
