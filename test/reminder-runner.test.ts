import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runSubscriptionReminderJob } from "../src/lib/reminder-runner.ts";

const dueRow = {
  id: "sub_due",
  user_id: "user_1",
  name: "Netflix",
  price: 9.99,
  currency: "USD",
  billing_cycle: "monthly" as const,
  category: "娱乐",
  start_date: "2026-04-15",
  next_billing_date: "2026-05-15",
  email_notifications_enabled: true,
  notify_days_before: 7,
  last_notification_sent_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  user_email: "user@example.com",
};

const notDueRow = {
  ...dueRow,
  id: "sub_later",
  name: "Spotify",
  next_billing_date: "2026-05-20",
};

describe("runSubscriptionReminderJob", () => {
  it("sends due reminders and marks only successful sends", async () => {
    const sent: string[] = [];
    const updated: string[] = [];

    const result = await runSubscriptionReminderJob({
      today: "2026-05-08",
      loadCandidates: async () => [dueRow, notDueRow],
      sendEmail: async (input) => {
        sent.push(input.subscriptionName);
        return { ok: true, id: "email_123" };
      },
      markSent: async (id) => {
        updated.push(id);
      },
    });

    assert.deepEqual(sent, ["Netflix"]);
    assert.deepEqual(updated, ["sub_due"]);
    assert.deepEqual(result, {
      checked: 2,
      due: 1,
      sent: 1,
      failed: 0,
    });
  });

  it("does not mark failed email sends as sent", async () => {
    const updated: string[] = [];

    const result = await runSubscriptionReminderJob({
      today: "2026-05-08",
      loadCandidates: async () => [dueRow],
      sendEmail: async () => ({
        ok: false,
        reason: "resend_error",
        message: "bad request",
      }),
      markSent: async (id) => {
        updated.push(id);
      },
    });

    assert.deepEqual(updated, []);
    assert.equal(result.sent, 0);
    assert.equal(result.failed, 1);
  });
});
