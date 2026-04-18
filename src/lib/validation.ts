import { z } from "zod";

export const subscriptionSchema = z.object({
  name: z.string().min(1, "请输入名称").max(100),
  price: z
    .string()
    .min(1, "请输入金额")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "金额必须大于 0"),
  currency: z.string(),
  billing_cycle: z.enum(["monthly", "yearly"]),
  category: z.string().min(1, "请选择类别"),
  start_date: z.string().min(1, "请选择开始日期"),
  next_billing_date: z.string().min(1, "请选择下次扣费日期"),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;
