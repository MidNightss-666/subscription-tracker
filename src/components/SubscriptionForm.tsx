"use client";

import { useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  categories,
  getCurrencySymbol,
  type Subscription,
} from "@/lib/subscriptions";
import {
  subscriptionSchema,
  type SubscriptionFormData,
} from "@/lib/validation";
import { getBillingPeriodDays } from "@/lib/reminders";

interface SubscriptionFormProps {
  subscription?: Subscription | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const currencies = ["USD", "CNY", "EUR", "GBP", "JPY"];

function calculateNextBillingDate(startDate: string, billingCycle: string) {
  if (!startDate) return "";

  const date = new Date(`${startDate}T00:00:00`);
  const now = new Date();
  while (date <= now) {
    if (billingCycle === "monthly") {
      date.setMonth(date.getMonth() + 1);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
  }

  return date.toISOString().slice(0, 10);
}

export function SubscriptionForm({
  subscription,
  onSuccess,
  onCancel,
}: SubscriptionFormProps) {
  const isEdit = Boolean(subscription);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: subscription?.name ?? "",
      price: subscription ? String(subscription.price) : "",
      currency: subscription?.currency ?? "USD",
      billing_cycle: subscription?.billing_cycle ?? "monthly",
      category: subscription?.category ?? "",
      start_date:
        subscription?.start_date ?? new Date().toISOString().slice(0, 10),
      next_billing_date: subscription?.next_billing_date ?? "",
      email_notifications_enabled:
        subscription?.email_notifications_enabled ?? false,
      notify_days_before: subscription
        ? String(subscription.notify_days_before)
        : "3",
    },
  });

  const { field: billingCycleField } = useController({
    name: "billing_cycle",
    control,
  });
  const { field: categoryField } = useController({
    name: "category",
    control,
  });
  const { field: currencyField } = useController({
    name: "currency",
    control,
  });

  const startDate = useWatch({ control, name: "start_date" });
  const billingCycle = useWatch({ control, name: "billing_cycle" });
  const currency = useWatch({ control, name: "currency" });
  const emailNotificationsEnabled = useWatch({
    control,
    name: "email_notifications_enabled",
  });
  const nextBillingDate = useWatch({ control, name: "next_billing_date" });

  let maxNotifyDays: number | null = null;
  try {
    if (nextBillingDate) {
      maxNotifyDays = getBillingPeriodDays(nextBillingDate, billingCycle);
    }
  } catch {
    maxNotifyDays = null;
  }

  function handleAutoCalcNextDate() {
    const next = calculateNextBillingDate(startDate, billingCycle);
    if (next) setValue("next_billing_date", next, { shouldValidate: true });
  }

  async function onSubmit(data: SubscriptionFormData) {
    setServerError(null);

    const payload = {
      name: data.name.trim(),
      price: Number(data.price),
      currency: data.currency,
      billing_cycle: data.billing_cycle,
      category: data.category,
      start_date: data.start_date,
      next_billing_date: data.next_billing_date,
      email_notifications_enabled: data.email_notifications_enabled,
      notify_days_before: Number(data.notify_days_before),
    };
    const supabase = createBrowserClient();

    if (isEdit && subscription) {
      const { error } = await supabase
        .from("subscriptions")
        .update(payload)
        .eq("id", subscription.id);

      if (error) {
        setServerError(error.message);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setServerError("请先登录");
        return;
      }

      const { error } = await supabase
        .from("subscriptions")
        .insert([{ ...payload, user_id: user.id }]);

      if (error) {
        setServerError(error.message);
        return;
      }
    }

    onSuccess();
  }

  const inputCls =
    "h-9 rounded-lg border-border/70 bg-background/45 text-[14px] text-foreground shadow-sm backdrop-blur-xl placeholder:text-muted-foreground";
  const labelCls = "text-[13px] text-muted-foreground";
  const errorCls = "mt-1 text-[12px] text-red-400";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
      <div className="space-y-2">
        <Label htmlFor="name" className={labelCls}>
          名称
        </Label>
        <Input
          id="name"
          placeholder="例如：Netflix"
          className={inputCls}
          {...register("name")}
        />
        {errors.name && <p className={errorCls}>{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
        <div className="space-y-2">
          <Label htmlFor="price" className={labelCls}>
            金额
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">
              {getCurrencySymbol(currency)}
            </span>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="9.99"
              className={`${inputCls} pl-8`}
              {...register("price")}
            />
          </div>
          {errors.price && <p className={errorCls}>{errors.price.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className={labelCls}>币种</Label>
          <Select value={currencyField.value} onValueChange={currencyField.onChange}>
            <SelectTrigger className={`${inputCls} w-full`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-border/70 bg-popover">
              {currencies.map((code) => (
                <SelectItem key={code} value={code} className="text-[14px]">
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className={labelCls}>计费周期</Label>
          <Select
            value={billingCycleField.value}
            onValueChange={billingCycleField.onChange}
          >
            <SelectTrigger className={`${inputCls} w-full`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-border/70 bg-popover">
              <SelectItem value="monthly" className="text-[14px]">
                每月
              </SelectItem>
              <SelectItem value="yearly" className="text-[14px]">
                每年
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className={labelCls}>类别</Label>
          <Select value={categoryField.value} onValueChange={categoryField.onChange}>
            <SelectTrigger className={`${inputCls} w-full`}>
              <SelectValue placeholder="选择类别" />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-border/70 bg-popover">
              {categories.map((category) => (
                <SelectItem key={category} value={category} className="text-[14px]">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className={errorCls}>{errors.category.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_date" className={labelCls}>
            开始日期
          </Label>
          <Input
            id="start_date"
            type="date"
            className={inputCls}
            {...register("start_date")}
          />
          {errors.start_date && (
            <p className={errorCls}>{errors.start_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="next_billing_date" className={labelCls}>
              下次扣费
            </Label>
            <button
              type="button"
              onClick={handleAutoCalcNextDate}
              className="flex items-center gap-1 text-[11px] text-sky-400 transition-colors hover:text-sky-300"
            >
              <CalendarClock className="h-3 w-3" />
              自动计算
            </button>
          </div>
          <Input
            id="next_billing_date"
            type="date"
            className={inputCls}
            {...register("next_billing_date")}
          />
          {errors.next_billing_date && (
            <p className={errorCls}>{errors.next_billing_date.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/35 p-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <Bell className="h-4 w-4 shrink-0 text-sky-400" />
            <span className="text-[13px] font-medium text-foreground">
              邮件提醒
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-sky-500"
            {...register("email_notifications_enabled")}
          />
        </label>

        {emailNotificationsEnabled && (
          <div className="mt-3 space-y-2">
            <Label htmlFor="notify_days_before" className={labelCls}>
              提前天数
            </Label>
            <Input
              id="notify_days_before"
              type="number"
              min="0"
              max={maxNotifyDays ?? 366}
              step="1"
              inputMode="numeric"
              className={inputCls}
              {...register("notify_days_before")}
            />
            <p className="text-[11px] text-muted-foreground">
              {maxNotifyDays === null
                ? "选择下次扣费日期后会按账期限制最大天数"
                : `当前账期最多可提前 ${maxNotifyDays} 天提醒`}
            </p>
            {errors.notify_days_before && (
              <p className={errorCls}>{errors.notify_days_before.message}</p>
            )}
          </div>
        )}
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-400/10 px-3 py-2 text-[13px] text-red-400">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-9 rounded-lg text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-9 gap-2 rounded-lg bg-primary px-5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "保存" : "添加"}
        </Button>
      </div>
    </form>
  );
}
