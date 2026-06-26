import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getCategoryBreakdown, getMonthlyAmount, type Subscription } from "../src/lib/subscriptions.ts";
import { calculateSubscriptionStats } from "../src/hooks/useSubscriptionStats.ts";
import type { ExchangeRateMap } from "../src/lib/exchange-rates.ts";

const baseSub: Subscription = {
  id: "sub_1",
  user_id: "user_1",
  name: "Service",
  price: 10,
  currency: "USD",
  billing_cycle: "monthly",
  category: "Work",
  start_date: "2026-01-01",
  next_billing_date: "2026-07-01",
  email_notifications_enabled: false,
  notify_days_before: 3,
  last_notification_sent_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const rates: ExchangeRateMap = { CNY: 1, USD: 7.2, EUR: 8 };

describe("converted subscription stats", () => {
  it("converts monthly and yearly subscriptions into monthly CNY amounts", () => {
    assert.equal(getMonthlyAmount(baseSub, rates).amount, 72);
    assert.equal(getMonthlyAmount({ ...baseSub, billing_cycle: "yearly", price: 120 }, rates).amount, 72);
  });

  it("aggregates category breakdowns with converted CNY amounts", () => {
    const breakdown = getCategoryBreakdown([
      baseSub,
      { ...baseSub, id: "sub_2", currency: "EUR", price: 5 },
      { ...baseSub, id: "sub_3", currency: "CNY", price: 20, category: "Life" },
    ], rates);

    assert.equal(breakdown.find((item) => item.name === "Work")?.value, 112);
    assert.equal(breakdown.find((item) => item.name === "Life")?.value, 20);
  });

  it("calculates dashboard totals and missing-rate metadata in CNY", () => {
    const stats = calculateSubscriptionStats([
      baseSub,
      { ...baseSub, id: "sub_2", currency: "GBP", price: 5 },
    ], { rates, today: new Date("2026-06-26T00:00:00") });

    assert.equal(stats.reportingCurrency, "CNY");
    assert.equal(stats.monthlyTotal, 77);
    assert.equal(stats.yearlyTotal, 924);
    assert.deepEqual(stats.missingRateCurrencies, ["GBP"]);
  });
});
