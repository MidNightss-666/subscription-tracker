import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getBillingPeriodDays,
  getReminderDate,
  isReminderDue,
  validateNotifyDaysBefore,
} from "../src/lib/reminders.ts";

describe("reminder billing-period rules", () => {
  it("uses actual monthly period length for February to March", () => {
    assert.equal(getBillingPeriodDays("2026-03-01", "monthly"), 28);
    assert.equal(validateNotifyDaysBefore(28, "2026-03-01", "monthly").valid, true);
    assert.equal(validateNotifyDaysBefore(29, "2026-03-01", "monthly").valid, false);
  });

  it("uses actual monthly period length for April to May", () => {
    assert.equal(getBillingPeriodDays("2026-05-15", "monthly"), 30);
    assert.equal(validateNotifyDaysBefore(30, "2026-05-15", "monthly").valid, true);
    assert.equal(validateNotifyDaysBefore(31, "2026-05-15", "monthly").valid, false);
  });

  it("allows yearly leap-year periods up to 366 days", () => {
    assert.equal(getBillingPeriodDays("2025-02-28", "yearly"), 366);
    assert.equal(validateNotifyDaysBefore(366, "2025-02-28", "yearly").valid, true);
    assert.equal(validateNotifyDaysBefore(367, "2025-02-28", "yearly").valid, false);
  });

  it("calculates reminder dates in UTC calendar days", () => {
    assert.equal(getReminderDate("2026-05-15", 7), "2026-05-08");
    assert.equal(getReminderDate("2026-05-15", 0), "2026-05-15");
  });

  it("detects due reminders and excludes disabled or already-sent reminders", () => {
    const dueSubscription = {
      email_notifications_enabled: true,
      notify_days_before: 7,
      next_billing_date: "2026-05-15",
      billing_cycle: "monthly" as const,
      last_notification_sent_at: null,
    };

    assert.equal(isReminderDue(dueSubscription, "2026-05-08"), true);
    assert.equal(
      isReminderDue(
        { ...dueSubscription, email_notifications_enabled: false },
        "2026-05-08"
      ),
      false
    );
    assert.equal(
      isReminderDue(
        { ...dueSubscription, last_notification_sent_at: "2026-05-08T10:00:00Z" },
        "2026-05-08"
      ),
      false
    );
  });
});
