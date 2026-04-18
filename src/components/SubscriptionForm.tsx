"use client";

import { useState } from "react";
import { useForm, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  type Subscription,
  categories,
} from "@/lib/subscriptions";
import {
  subscriptionSchema,
  type SubscriptionFormData,
} from "@/lib/validation";

interface SubscriptionFormProps {
  subscription?: Subscription | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function calculateNextBillingDate(startDate: string, billingCycle: string): string {
  if (!startDate) return "";
  const date = new Date(startDate + "T00:00:00");
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
  const isEdit = !!subscription;
  const [serverError, setServerError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: subscription?.name ?? "",
      price: subscription ? String(subscription.price) : "",
      currency: subscription?.currency ?? "USD",
      billing_cycle: subscription?.billing_cycle ?? "monthly",
      category: subscription?.category ?? "",
      start_date: subscription?.start_date ?? new Date().toISOString().slice(0, 10),
      next_billing_date: subscription?.next_billing_date ?? "",
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

  const priceValue = watch("price");
  const startDate = watch("start_date");
  const billingCycle = watch("billing_cycle");

  function handleAutoCalcNextDate() {
    const next = calculateNextBillingDate(startDate, billingCycle);
    if (next) setValue("next_billing_date", next, { shouldValidate: true });
  }

  async function onSubmit(data: SubscriptionFormData) {
    setServerError(null);

    const payload = {
      name: data.name,
      price: Number(data.price),
      currency: data.currency,
      billing_cycle: data.billing_cycle,
      category: data.category,
      start_date: data.start_date,
      next_billing_date: data.next_billing_date,
    };

    if (isEdit) {
      const { error } = await supabase
        .from("subscriptions")
        .update(payload)
        .eq("id", subscription.id);

      if (error) {
        setServerError(error.message);
        return;
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
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
    "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600 h-9 text-[14px] rounded-lg";
  const labelCls = "text-zinc-400 text-[13px]";
  const errorCls = "text-[12px] text-red-400 mt-1";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
      {/* 名称 */}
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

      {/* 金额 + 计费周期 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price" className={labelCls}>
            金额
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[14px]">$</span>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="9.99"
              className={`${inputCls} pl-7`}
              {...register("price")}
            />
          </div>
          {errors.price && <p className={errorCls}>{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className={labelCls}>计费周期</Label>
          <Select
            value={billingCycleField.value}
            onValueChange={billingCycleField.onChange}
          >
            <SelectTrigger
              className={`${inputCls} w-full`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1f] border-white/[0.08] rounded-lg">
              <SelectItem value="monthly" className="text-[14px]">
                每月
              </SelectItem>
              <SelectItem value="yearly" className="text-[14px]">
                每年
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 日期 */}
      <div className="grid grid-cols-2 gap-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="next_billing_date" className={labelCls}>
              下次扣费
            </Label>
            <button
              type="button"
              onClick={handleAutoCalcNextDate}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
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

      {/* 类别 */}
      <div className="space-y-2">
        <Label className={labelCls}>类别</Label>
        <Select
          value={categoryField.value}
          onValueChange={categoryField.onChange}
        >
          <SelectTrigger className={`${inputCls} w-full`}>
            <SelectValue placeholder="选择类别" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1f] border-white/[0.08] rounded-lg">
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="text-[14px]">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className={errorCls}>{errors.category.message}</p>
        )}
      </div>

      {/* 服务端错误 */}
      {serverError && (
        <p className="text-[13px] text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          {serverError}
        </p>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-zinc-400 hover:text-white hover:bg-white/[0.06] text-[13px] h-9 rounded-lg"
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-white text-black hover:bg-zinc-200 font-medium text-[13px] h-9 px-5 rounded-lg gap-2"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "保存" : "添加"}
        </Button>
      </div>
    </form>
  );
}
