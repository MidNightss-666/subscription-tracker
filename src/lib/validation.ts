import { z } from "zod";
import { validateNotifyDaysBefore } from "./reminders";

export const subscriptionSchema = z
  .object({
    name: z.string().min(1, "请输入名称").max(100, "名称不能超过 100 个字符"),
    price: z
      .string()
      .min(1, "请输入金额")
      .refine((value) => !Number.isNaN(Number(value)), "请输入有效金额")
      .refine((value) => Number(value) > 0, "金额必须大于 0"),
    currency: z.string().min(1, "请选择币种"),
    billing_cycle: z.enum(["monthly", "yearly"]),
    category: z.string().min(1, "请选择类别"),
    start_date: z.string().min(1, "请选择开始日期"),
    next_billing_date: z.string().min(1, "请选择下次扣费日期"),
    email_notifications_enabled: z.boolean(),
    notify_days_before: z
      .string()
      .min(1, "请输入提醒天数")
      .refine((value) => Number.isInteger(Number(value)), "提醒天数必须是整数")
      .refine((value) => Number(value) >= 0, "提醒天数不能小于 0")
      .refine((value) => Number(value) <= 366, "提醒天数不能超过 366"),
  })
  .superRefine((data, ctx) => {
    if (!data.email_notifications_enabled) {
      return;
    }

    const validation = validateNotifyDaysBefore(
      Number(data.notify_days_before),
      data.next_billing_date,
      data.billing_cycle
    );

    if (!validation.valid) {
      ctx.addIssue({
        code: "custom",
        path: ["notify_days_before"],
        message: validation.message ?? "提醒天数超出当前账期",
      });
    }
  });

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;
