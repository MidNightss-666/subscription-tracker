import type { BillingCycle } from "@/lib/subscriptions";
import { formatMoney } from "@/lib/subscriptions";
import { isReminderDue } from "@/lib/reminders";
import {
  sendSubscriptionReminderEmail,
  type ReminderEmailInput,
  type ReminderEmailResult,
} from "@/lib/email/reminder";

export interface ReminderCandidate {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  email_notifications_enabled: boolean;
  notify_days_before: number;
  last_notification_sent_at: string | null;
  user_email: string | null;
}

export interface ReminderJobResult {
  checked: number;
  due: number;
  sent: number;
  failed: number;
}

export interface ReminderJobDependencies {
  today?: string;
  loadCandidates: () => Promise<ReminderCandidate[]>;
  sendEmail?: (input: ReminderEmailInput) => Promise<ReminderEmailResult>;
  markSent: (id: string) => Promise<void>;
}

function todayUtcDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export async function runSubscriptionReminderJob({
  today = todayUtcDateOnly(),
  loadCandidates,
  sendEmail = sendSubscriptionReminderEmail,
  markSent,
}: ReminderJobDependencies): Promise<ReminderJobResult> {
  const candidates = await loadCandidates();
  let due = 0;
  let sent = 0;
  let failed = 0;

  for (const candidate of candidates) {
    if (!candidate.user_email || !isReminderDue(candidate, today)) {
      continue;
    }

    due += 1;
    const result = await sendEmail({
      to: candidate.user_email,
      subscriptionName: candidate.name,
      nextBillingDate: candidate.next_billing_date,
      daysBefore: candidate.notify_days_before,
      amount: formatMoney(candidate.price, candidate.currency),
    });

    if (result.ok) {
      await markSent(candidate.id);
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return {
    checked: candidates.length,
    due,
    sent,
    failed,
  };
}
