import type { BillingCycle } from "@/lib/subscriptions";

export interface ReminderValidationResult {
  valid: boolean;
  maxDays: number;
  message?: string;
}

export interface ReminderDueInput {
  email_notifications_enabled: boolean;
  notify_days_before: number;
  next_billing_date: string;
  billing_cycle: BillingCycle;
  last_notification_sent_at: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid date");
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function subtractCalendarMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonthIndex = month - months;
  const targetFirst = new Date(Date.UTC(year, targetMonthIndex, 1));
  const maxDay = daysInMonth(
    targetFirst.getUTCFullYear(),
    targetFirst.getUTCMonth()
  );

  targetFirst.setUTCDate(Math.min(day, maxDay));
  return targetFirst;
}

function subtractCalendarYears(date: Date, years: number) {
  const year = date.getUTCFullYear() - years;
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const maxDay = daysInMonth(year, month);

  return new Date(Date.UTC(year, month, Math.min(day, maxDay)));
}

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function getBillingPeriodDays(
  nextBillingDate: string,
  billingCycle: BillingCycle
) {
  const nextDate = parseDateOnly(nextBillingDate);
  const periodStart =
    billingCycle === "monthly"
      ? subtractCalendarMonths(nextDate, 1)
      : subtractCalendarYears(nextDate, 1);

  return daysBetween(periodStart, nextDate);
}

export function validateNotifyDaysBefore(
  value: number,
  nextBillingDate: string,
  billingCycle: BillingCycle
): ReminderValidationResult {
  const maxDays = getBillingPeriodDays(nextBillingDate, billingCycle);

  if (!Number.isInteger(value)) {
    return { valid: false, maxDays, message: "提醒天数必须是整数" };
  }

  if (value < 0) {
    return { valid: false, maxDays, message: "提醒天数不能小于 0" };
  }

  if (value > maxDays) {
    return {
      valid: false,
      maxDays,
      message: `提醒天数不能超过当前账期的 ${maxDays} 天`,
    };
  }

  return { valid: true, maxDays };
}

export function getReminderDate(nextBillingDate: string, daysBefore: number) {
  const date = parseDateOnly(nextBillingDate);
  date.setUTCDate(date.getUTCDate() - daysBefore);
  return formatDateOnly(date);
}

export function isReminderDue(subscription: ReminderDueInput, today: string) {
  if (!subscription.email_notifications_enabled) {
    return false;
  }

  const validation = validateNotifyDaysBefore(
    subscription.notify_days_before,
    subscription.next_billing_date,
    subscription.billing_cycle
  );

  if (!validation.valid) {
    return false;
  }

  const reminderDate = getReminderDate(
    subscription.next_billing_date,
    subscription.notify_days_before
  );

  if (reminderDate !== today) {
    return false;
  }

  return subscription.last_notification_sent_at?.slice(0, 10) !== today;
}
