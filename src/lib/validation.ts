import { z } from "zod";

export const subscriptionSchema = z.object({
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
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

