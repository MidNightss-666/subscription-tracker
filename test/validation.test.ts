import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { subscriptionSchema } from "../src/lib/validation.ts";

const validBase = {
  name: "Netflix",
  price: "9.99",
  currency: "USD",
  billing_cycle: "monthly" as const,
  category: "娱乐",
  start_date: "2026-02-01",
  next_billing_date: "2026-03-01",
  email_notifications_enabled: true,
  notify_days_before: "28",
};

describe("subscription form validation", () => {
  it("accepts reminder days inside the monthly billing period", () => {
    const result = subscriptionSchema.safeParse(validBase);

    assert.equal(result.success, true);
  });

  it("rejects reminder days that exceed the monthly billing period", () => {
    const result = subscriptionSchema.safeParse({
      ...validBase,
      notify_days_before: "29",
    });

    assert.equal(result.success, false);
  });

  it("allows disabled reminders to keep an out-of-period saved value", () => {
    const result = subscriptionSchema.safeParse({
      ...validBase,
      email_notifications_enabled: false,
      notify_days_before: "60",
    });

    assert.equal(result.success, true);
  });

  it("accepts yearly leap-period reminder days up to 366", () => {
    const result = subscriptionSchema.safeParse({
      ...validBase,
      billing_cycle: "yearly",
      next_billing_date: "2025-02-28",
      notify_days_before: "366",
    });

    assert.equal(result.success, true);
  });
});
