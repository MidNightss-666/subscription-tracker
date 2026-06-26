# Exchange Rates CNY Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch Fixer exchange rates daily and use cached rates to report all subscription statistics in CNY.

**Architecture:** Store normalized `source currency -> CNY` rates in Supabase and refresh them through a protected Next.js Route Handler that mirrors the existing reminder cron route. Keep conversion rules in pure helpers so stats, charts, and tests share one behavior. The dashboard reads exchange rates as reference data and passes a rate map into the existing stats hook.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase PostgreSQL, Supabase JS, Node built-in test runner, TypeScript, Fixer HTTP API.

---

## File Structure

- Create `src/lib/exchange-rates.ts`: pure currency constants, rate types, conversion helpers, Fixer response normalization, and stale-rate metadata helpers.
- Create `test/exchange-rates.test.ts`: Node tests for CNY conversion, missing-rate fallback, invalid-rate rejection, and Fixer response normalization.
- Modify `src/lib/subscriptions.ts`: accept exchange-rate maps in monthly amount and category helpers, export `REPORTING_CURRENCY = "CNY"`, and format aggregate money as CNY.
- Modify `src/hooks/useSubscriptionStats.ts`: accept an exchange-rate map, convert all totals and forecasts into CNY, and return rate availability metadata.
- Create `test/subscription-stats.test.ts`: Node tests for converted monthly totals, category breakdowns, scheduled-month totals, and forecast values.
- Create `src/lib/exchange-rate-runner.ts`: server-side sync runner with injected fetch/store dependencies.
- Create `test/exchange-rate-runner.test.ts`: runner tests for storing valid Fixer rates, always including CNY, and rejecting invalid rates.
- Create `src/app/api/exchange-rates/sync/route.ts`: protected `POST` endpoint for daily sync.
- Create `test/exchange-rate-route.test.ts`: route authorization and success/failure tests.
- Create `supabase/003_create_exchange_rates.sql`: exchange-rate table, RLS, read policy, and updated-at trigger.
- Modify `src/app/page.tsx`: load exchange-rate rows with the browser Supabase client and pass the rate map to dashboard stats components.
- Modify `src/components/StatsCards.tsx`: accept rates and display aggregate money in CNY with a small warning when rates are missing.
- Modify `src/components/CategoryChart.tsx`: accept rates and format tooltip/center values in CNY.
- Modify `src/components/ForecastChart.tsx`: accept rates and format tooltip/axis values in CNY.
- Modify `README.md`: document Fixer variables, migration, daily sync route, and CNY reporting.
- Modify `package.json`: add the new test files to the existing `test` script.

## Tasks

### Task 1: Pure Exchange-Rate Helpers

**Files:**
- Create: `test/exchange-rates.test.ts`
- Create: `src/lib/exchange-rates.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing helper tests**

Create `test/exchange-rates.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  REPORTING_CURRENCY,
  buildExchangeRateMap,
  convertMoney,
  getMissingRateCurrencies,
  normalizeFixerRatesToCny,
  validateExchangeRate,
  type ExchangeRateRow,
} from "../src/lib/exchange-rates.ts";

const rows: ExchangeRateRow[] = [
  { base_currency: "USD", target_currency: "CNY", rate: 7.2, fetched_at: "2026-06-26T00:00:00Z" },
  { base_currency: "EUR", target_currency: "CNY", rate: 7.8, fetched_at: "2026-06-26T00:00:00Z" },
];

describe("exchange-rate helpers", () => {
  it("reports CNY as the fixed dashboard currency", () => {
    assert.equal(REPORTING_CURRENCY, "CNY");
  });

  it("converts source amounts into CNY and treats CNY as 1", () => {
    const rates = buildExchangeRateMap(rows);
    assert.equal(convertMoney(10, "USD", rates).amount, 72);
    assert.equal(convertMoney(10, "CNY", rates).amount, 10);
    assert.equal(convertMoney(10, "USD", rates).missingRate, false);
  });

  it("falls back to the nominal amount when a non-CNY rate is missing", () => {
    const result = convertMoney(10, "GBP", buildExchangeRateMap(rows));
    assert.deepEqual(result, { amount: 10, missingRate: true });
    assert.deepEqual(getMissingRateCurrencies(["USD", "GBP", "JPY"], buildExchangeRateMap(rows)), ["GBP", "JPY"]);
  });

  it("rejects invalid exchange rates", () => {
    assert.equal(validateExchangeRate(1), true);
    assert.equal(validateExchangeRate(0), false);
    assert.equal(validateExchangeRate(-1), false);
    assert.equal(validateExchangeRate(Number.NaN), false);
    assert.equal(validateExchangeRate(Number.POSITIVE_INFINITY), false);
  });

  it("normalizes Fixer rates against a shared provider base into source-to-CNY rates", () => {
    const normalized = normalizeFixerRatesToCny({
      fetchedAt: "2026-06-26T00:00:00Z",
      rates: { CNY: 7.2, USD: 1, EUR: 0.9, GBP: 0.8, JPY: 160 },
      supportedCurrencies: ["USD", "CNY", "EUR", "GBP", "JPY"],
    });

    assert.deepEqual(normalized.map((row) => row.base_currency), ["USD", "CNY", "EUR", "GBP", "JPY"]);
    assert.equal(normalized.find((row) => row.base_currency === "CNY")?.rate, 1);
    assert.equal(normalized.find((row) => row.base_currency === "USD")?.rate, 7.2);
    assert.equal(normalized.find((row) => row.base_currency === "EUR")?.rate, 8);
    assert.equal(normalized.find((row) => row.base_currency === "GBP")?.rate, 9);
    assert.equal(normalized.find((row) => row.base_currency === "JPY")?.rate, 0.045);
  });
});
```

- [ ] **Step 2: Add tests to the npm script**

Modify `package.json` so the `test` script begins with the new helper test:

```json
"test": "node --loader ./test/ts-alias-loader.mjs test/exchange-rates.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminders.test.ts && node --loader ./test/ts-alias-loader.mjs test/validation.test.ts && node --loader ./test/ts-alias-loader.mjs test/email-reminder.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminder-runner.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminder-route.test.ts"
```

- [ ] **Step 3: Run the helper test and verify RED**

Run:

```bash
node --loader ./test/ts-alias-loader.mjs test/exchange-rates.test.ts
```

Expected: FAIL because `src/lib/exchange-rates.ts` does not exist.

- [ ] **Step 4: Implement the minimal helper module**

Create `src/lib/exchange-rates.ts`:

```ts
export const REPORTING_CURRENCY = "CNY";
export const SUPPORTED_CURRENCIES = ["USD", "CNY", "EUR", "GBP", "JPY"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export type ExchangeRateMap = Record<string, number>;

export interface ExchangeRateRow {
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
}

export interface ConvertedMoney {
  amount: number;
  missingRate: boolean;
}

export function validateExchangeRate(rate: number) {
  return Number.isFinite(rate) && rate > 0;
}

export function buildExchangeRateMap(rows: ExchangeRateRow[] = []): ExchangeRateMap {
  const rates: ExchangeRateMap = { [REPORTING_CURRENCY]: 1 };
  for (const row of rows) {
    if (row.target_currency === REPORTING_CURRENCY && validateExchangeRate(Number(row.rate))) {
      rates[row.base_currency] = Number(row.rate);
    }
  }
  return rates;
}

export function convertMoney(amount: number, currency: string, rates: ExchangeRateMap = {}): ConvertedMoney {
  if (currency === REPORTING_CURRENCY) {
    return { amount, missingRate: false };
  }

  const rate = rates[currency];
  if (!validateExchangeRate(rate)) {
    return { amount, missingRate: true };
  }

  return { amount: amount * rate, missingRate: false };
}

export function getMissingRateCurrencies(currencies: string[], rates: ExchangeRateMap = {}) {
  return Array.from(new Set(currencies))
    .filter((currency) => currency !== REPORTING_CURRENCY)
    .filter((currency) => !validateExchangeRate(rates[currency]))
    .sort();
}

interface NormalizeFixerInput {
  fetchedAt: string;
  rates: Record<string, number>;
  supportedCurrencies?: readonly string[];
}

export function normalizeFixerRatesToCny({
  fetchedAt,
  rates,
  supportedCurrencies = SUPPORTED_CURRENCIES,
}: NormalizeFixerInput): ExchangeRateRow[] {
  const cnyRate = Number(rates[REPORTING_CURRENCY]);
  if (!validateExchangeRate(cnyRate)) {
    throw new Error("Fixer response is missing a valid CNY rate");
  }

  return supportedCurrencies.map((currency) => {
    if (currency === REPORTING_CURRENCY) {
      return {
        base_currency: REPORTING_CURRENCY,
        target_currency: REPORTING_CURRENCY,
        rate: 1,
        fetched_at: fetchedAt,
      };
    }

    const sourceRate = Number(rates[currency]);
    if (!validateExchangeRate(sourceRate)) {
      throw new Error(`Fixer response is missing a valid ${currency} rate`);
    }

    return {
      base_currency: currency,
      target_currency: REPORTING_CURRENCY,
      rate: Number((cnyRate / sourceRate).toFixed(8)),
      fetched_at: fetchedAt,
    };
  });
}
```

- [ ] **Step 5: Run the helper test and verify GREEN**

Run:

```bash
node --loader ./test/ts-alias-loader.mjs test/exchange-rates.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add package.json src/lib/exchange-rates.ts test/exchange-rates.test.ts
git commit -m "Add exchange rate helpers"
```

### Task 2: Converted Subscription Statistics

**Files:**
- Create: `test/subscription-stats.test.ts`
- Modify: `src/lib/subscriptions.ts`
- Modify: `src/hooks/useSubscriptionStats.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing stats tests**

Create `test/subscription-stats.test.ts`:

```ts
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
```

- [ ] **Step 2: Add the stats test to the npm script**

Modify `package.json` so `test/subscription-stats.test.ts` runs after `test/exchange-rates.test.ts`:

```json
"test": "node --loader ./test/ts-alias-loader.mjs test/exchange-rates.test.ts && node --loader ./test/ts-alias-loader.mjs test/subscription-stats.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminders.test.ts && node --loader ./test/ts-alias-loader.mjs test/validation.test.ts && node --loader ./test/ts-alias-loader.mjs test/email-reminder.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminder-runner.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminder-route.test.ts"
```

- [ ] **Step 3: Run the stats test and verify RED**

Run:

```bash
node --loader ./test/ts-alias-loader.mjs test/subscription-stats.test.ts
```

Expected: FAIL because `calculateSubscriptionStats` is not exported and `getMonthlyAmount` still returns a number.

- [ ] **Step 4: Update subscription money helpers**

Modify `src/lib/subscriptions.ts` imports and helpers:

```ts
import {
  REPORTING_CURRENCY,
  convertMoney,
  getMissingRateCurrencies,
  type ConvertedMoney,
  type ExchangeRateMap,
} from "@/lib/exchange-rates";
```

Replace aggregate helper behavior with:

```ts
export function formatMoney(value: number, currency = REPORTING_CURRENCY) {
  return `${getCurrencySymbol(currency)}${value.toFixed(2)}`;
}

export function getMonthlyAmount(
  sub: Subscription,
  rates: ExchangeRateMap = {}
): ConvertedMoney {
  const monthly =
    sub.billing_cycle === "yearly"
      ? Number((sub.price / 12).toFixed(2))
      : sub.price;
  const converted = convertMoney(monthly, sub.currency, rates);

  return {
    amount: Number(converted.amount.toFixed(2)),
    missingRate: converted.missingRate,
  };
}

export function getTotalMonthly(subs: Subscription[], rates: ExchangeRateMap = {}) {
  return Number(
    subs.reduce((sum, sub) => sum + getMonthlyAmount(sub, rates).amount, 0).toFixed(2)
  );
}

export function getCategoryBreakdown(subs: Subscription[], rates: ExchangeRateMap = {}) {
  const map = new Map<string, number>();
  for (const sub of subs) {
    const monthly = getMonthlyAmount(sub, rates).amount;
    map.set(sub.category, (map.get(sub.category) || 0) + monthly);
  }

  return Array.from(map, ([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
    color: categoryColors[name as Category] || "#888",
  }));
}

export function getMissingSubscriptionRateCurrencies(
  subs: Subscription[],
  rates: ExchangeRateMap = {}
) {
  return getMissingRateCurrencies(
    subs.map((sub) => sub.currency),
    rates
  );
}
```

- [ ] **Step 5: Extract a testable stats calculator**

Modify `src/hooks/useSubscriptionStats.ts` to export a pure calculator and keep the hook as a memoized wrapper:

```ts
import { useMemo } from "react";
import {
  getCategoryBreakdown,
  getMissingSubscriptionRateCurrencies,
  getMonthlyAmount,
  type Subscription,
} from "@/lib/subscriptions";
import {
  REPORTING_CURRENCY,
  convertMoney,
  type ExchangeRateMap,
} from "@/lib/exchange-rates";
```

Add fields to `SubscriptionStats`:

```ts
reportingCurrency: typeof REPORTING_CURRENCY;
missingRateCurrencies: string[];
```

Change scheduled totals and forecast helpers to receive `rates` and use converted amounts:

```ts
function getScheduledTotalForMonth(
  subscriptions: Subscription[],
  monthStart: Date,
  rates: ExchangeRateMap = {}
) {
  const monthEnd = endOfMonth(monthStart);

  return Number(
    subscriptions
      .reduce((sum, sub) => {
        const startDate = parseLocalDate(sub.start_date);
        if (startDate > monthEnd) return sum;

        const firstBilling = getFirstRecurringDateOnOrAfter(
          startDate,
          sub.billing_cycle,
          monthStart
        );
        if (firstBilling > monthEnd) return sum;

        return sum + convertMoney(sub.price, sub.currency, rates).amount;
      }, 0)
      .toFixed(2)
  );
}
```

Export the calculator:

```ts
export function calculateSubscriptionStats(
  subscriptions: Subscription[],
  options: { rates?: ExchangeRateMap; today?: Date } = {}
): SubscriptionStats {
  const rates = options.rates ?? {};
  const today = options.today ?? new Date();
  const monthlyTotal = Number(
    subscriptions
      .reduce((sum, sub) => sum + getMonthlyAmount(sub, rates).amount, 0)
      .toFixed(2)
  );
  const yearlyTotal = Number((monthlyTotal * 12).toFixed(2));
  const currentMonth = startOfMonth(today);
  const previousMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1
  );
  const currentMonthTotal = getScheduledTotalForMonth(
    subscriptions,
    currentMonth,
    rates
  );
  const previousMonthTotal = getScheduledTotalForMonth(
    subscriptions,
    previousMonth,
    rates
  );
  const growthRate =
    previousMonthTotal > 0
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : currentMonthTotal > 0
        ? 100
        : 0;

  return {
    reportingCurrency: REPORTING_CURRENCY,
    monthlyTotal,
    yearlyTotal,
    currentMonthTotal,
    previousMonthTotal,
    growthRate: Number(growthRate.toFixed(1)),
    categoryBreakdown: getCategoryBreakdown(subscriptions, rates),
    monthlyForecast: getForecast(subscriptions, 6, rates, today),
    missingRateCurrencies: getMissingSubscriptionRateCurrencies(subscriptions, rates),
  };
}

export function useSubscriptionStats(
  subscriptions: Subscription[],
  rates: ExchangeRateMap = {}
): SubscriptionStats {
  return useMemo(
    () => calculateSubscriptionStats(subscriptions, { rates }),
    [subscriptions, rates]
  );
}
```

Update `getForecast` to accept `rates`, `months`, and `today`, then add converted charge amounts with `convertMoney(sub.price, sub.currency, rates).amount`.

- [ ] **Step 6: Run the stats test and verify GREEN**

Run:

```bash
node --loader ./test/ts-alias-loader.mjs test/subscription-stats.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Run:

```bash
git add package.json src/lib/subscriptions.ts src/hooks/useSubscriptionStats.ts test/subscription-stats.test.ts
git commit -m "Convert subscription stats to CNY"
```

### Task 3: Exchange-Rate Sync Runner and Fixer Provider

**Files:**
- Create: `test/exchange-rate-runner.test.ts`
- Create: `src/lib/exchange-rate-runner.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing runner tests**

Create `test/exchange-rate-runner.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fetchFixerRates,
  runExchangeRateSyncJob,
  type StoredExchangeRate,
} from "../src/lib/exchange-rate-runner.ts";

describe("exchange-rate sync runner", () => {
  it("stores normalized provider rates and includes CNY", async () => {
    const stored: StoredExchangeRate[][] = [];
    const result = await runExchangeRateSyncJob({
      fetchRates: async () => [
        { base_currency: "USD", target_currency: "CNY", rate: 7.2, fetched_at: "2026-06-26T00:00:00Z" },
        { base_currency: "CNY", target_currency: "CNY", rate: 1, fetched_at: "2026-06-26T00:00:00Z" },
      ],
      storeRates: async (rates) => {
        stored.push(rates);
        return rates.length;
      },
    });

    assert.equal(result.fetched, 2);
    assert.equal(result.stored, 2);
    assert.deepEqual(stored[0].map((rate) => rate.base_currency), ["USD", "CNY"]);
  });

  it("rejects invalid provider rates before storing", async () => {
    await assert.rejects(
      () =>
        runExchangeRateSyncJob({
          fetchRates: async () => [
            { base_currency: "USD", target_currency: "CNY", rate: 0, fetched_at: "2026-06-26T00:00:00Z" },
          ],
          storeRates: async () => 1,
        }),
      /Invalid exchange rate/
    );
  });

  it("normalizes a Fixer response fetched with a server API key", async () => {
    const calls: string[] = [];
    const rates = await fetchFixerRates({
      apiKey: "fake_key",
      fetchImpl: async (url) => {
        calls.push(String(url));
        return new Response(
          JSON.stringify({
            success: true,
            timestamp: 1782432000,
            base: "EUR",
            date: "2026-06-26",
            rates: { CNY: 7.8, USD: 1.1, EUR: 1, GBP: 0.85, JPY: 170 },
          })
        );
      },
    });

    assert.equal(calls[0].includes("access_key=fake_key"), true);
    assert.equal(rates.find((rate) => rate.base_currency === "USD")?.rate, 7.09090909);
    assert.equal(rates.find((rate) => rate.base_currency === "CNY")?.rate, 1);
  });
});
```

- [ ] **Step 2: Add the runner test to the npm script**

Modify `package.json` so `test/exchange-rate-runner.test.ts` runs after the stats test:

```json
"test": "node --loader ./test/ts-alias-loader.mjs test/exchange-rates.test.ts && node --loader ./test/ts-alias-loader.mjs test/subscription-stats.test.ts && node --loader ./test/ts-alias-loader.mjs test/exchange-rate-runner.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminders.test.ts && node --loader ./test/ts-alias-loader.mjs test/validation.test.ts && node --loader ./test/ts-alias-loader.mjs test/email-reminder.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminder-runner.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminder-route.test.ts"
```

- [ ] **Step 3: Run the runner test and verify RED**

Run:

```bash
node --loader ./test/ts-alias-loader.mjs test/exchange-rate-runner.test.ts
```

Expected: FAIL because `src/lib/exchange-rate-runner.ts` does not exist.

- [ ] **Step 4: Implement the runner and Fixer provider**

Create `src/lib/exchange-rate-runner.ts`:

```ts
import {
  SUPPORTED_CURRENCIES,
  normalizeFixerRatesToCny,
  validateExchangeRate,
  type ExchangeRateRow,
} from "@/lib/exchange-rates";

export type StoredExchangeRate = ExchangeRateRow;

export interface ExchangeRateSyncResult {
  fetched: number;
  stored: number;
}

interface FetchFixerRatesInput {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

interface FixerResponse {
  success?: boolean;
  timestamp?: number;
  date?: string;
  rates?: Record<string, number>;
  error?: { info?: string };
}

export async function fetchFixerRates({
  apiKey = process.env.FIXER_API_KEY,
  fetchImpl = fetch,
}: FetchFixerRatesInput = {}): Promise<StoredExchangeRate[]> {
  if (!apiKey) {
    throw new Error("FIXER_API_KEY is not configured");
  }

  const url = new URL("https://data.fixer.io/api/latest");
  url.searchParams.set("access_key", apiKey);
  url.searchParams.set("symbols", SUPPORTED_CURRENCIES.join(","));

  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error("Fixer request failed");
  }

  const payload = (await response.json()) as FixerResponse;
  if (payload.success === false || !payload.rates) {
    throw new Error(payload.error?.info ?? "Fixer response was not successful");
  }

  const fetchedAt = payload.timestamp
    ? new Date(payload.timestamp * 1000).toISOString()
    : new Date().toISOString();

  return normalizeFixerRatesToCny({
    fetchedAt,
    rates: payload.rates,
    supportedCurrencies: SUPPORTED_CURRENCIES,
  });
}

export interface ExchangeRateJobDependencies {
  fetchRates?: () => Promise<StoredExchangeRate[]>;
  storeRates: (rates: StoredExchangeRate[]) => Promise<number>;
}

export async function runExchangeRateSyncJob({
  fetchRates = fetchFixerRates,
  storeRates,
}: ExchangeRateJobDependencies): Promise<ExchangeRateSyncResult> {
  const rates = await fetchRates();

  for (const rate of rates) {
    if (
      rate.target_currency !== "CNY" ||
      !validateExchangeRate(Number(rate.rate))
    ) {
      throw new Error(`Invalid exchange rate for ${rate.base_currency}`);
    }
  }

  const stored = await storeRates(rates);

  return {
    fetched: rates.length,
    stored,
  };
}
```

- [ ] **Step 5: Run the runner test and verify GREEN**

Run:

```bash
node --loader ./test/ts-alias-loader.mjs test/exchange-rate-runner.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add package.json src/lib/exchange-rate-runner.ts test/exchange-rate-runner.test.ts
git commit -m "Add exchange rate sync runner"
```

### Task 4: Protected Sync Route and Supabase Migration

**Files:**
- Create: `test/exchange-rate-route.test.ts`
- Create: `src/app/api/exchange-rates/sync/route.ts`
- Create: `supabase/003_create_exchange_rates.sql`
- Modify: `package.json`

- [ ] **Step 1: Write failing route tests**

Create `test/exchange-rate-route.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleExchangeRateSyncRequest } from "../src/app/api/exchange-rates/sync/route.ts";

describe("exchange-rate sync route", () => {
  it("rejects requests without a bearer token", async () => {
    const response = await handleExchangeRateSyncRequest(
      new Request("https://example.com/api/exchange-rates/sync", { method: "POST" }),
      {
        env: { EXCHANGE_RATE_CRON_SECRET: "secret" },
        runJob: async () => ({ fetched: 0, stored: 0 }),
      }
    );

    assert.equal(response.status, 401);
  });

  it("rejects requests with the wrong bearer token", async () => {
    const response = await handleExchangeRateSyncRequest(
      new Request("https://example.com/api/exchange-rates/sync", {
        method: "POST",
        headers: { Authorization: "Bearer wrong" },
      }),
      {
        env: { EXCHANGE_RATE_CRON_SECRET: "secret" },
        runJob: async () => ({ fetched: 0, stored: 0 }),
      }
    );

    assert.equal(response.status, 401);
  });

  it("runs the sync job for requests with the cron secret", async () => {
    let called = false;
    const response = await handleExchangeRateSyncRequest(
      new Request("https://example.com/api/exchange-rates/sync", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
      {
        env: { EXCHANGE_RATE_CRON_SECRET: "secret" },
        runJob: async () => {
          called = true;
          return { fetched: 5, stored: 5 };
        },
      }
    );

    assert.equal(response.status, 200);
    assert.equal(called, true);
    assert.deepEqual(await response.json(), { fetched: 5, stored: 5 });
  });

  it("returns a generic error when the sync job fails", async () => {
    const response = await handleExchangeRateSyncRequest(
      new Request("https://example.com/api/exchange-rates/sync", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
      {
        env: { EXCHANGE_RATE_CRON_SECRET: "secret" },
        runJob: async () => {
          throw new Error("provider details");
        },
      }
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Exchange rate sync failed" });
  });
});
```

- [ ] **Step 2: Add the route test to the npm script**

Modify `package.json` so `test/exchange-rate-route.test.ts` runs after the runner test:

```json
"test": "node --loader ./test/ts-alias-loader.mjs test/exchange-rates.test.ts && node --loader ./test/ts-alias-loader.mjs test/subscription-stats.test.ts && node --loader ./test/ts-alias-loader.mjs test/exchange-rate-runner.test.ts && node --loader ./test/ts-alias-loader.mjs test/exchange-rate-route.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminders.test.ts && node --loader ./test/ts-alias-loader.mjs test/validation.test.ts && node --loader ./test/ts-alias-loader.mjs test/email-reminder.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminder-runner.test.ts && node --loader ./test/ts-alias-loader.mjs test/reminder-route.test.ts"
```

- [ ] **Step 3: Run the route test and verify RED**

Run:

```bash
node --loader ./test/ts-alias-loader.mjs test/exchange-rate-route.test.ts
```

Expected: FAIL because the route file does not exist.

- [ ] **Step 4: Implement the route**

Create `src/app/api/exchange-rates/sync/route.ts`:

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import {
  runExchangeRateSyncJob,
  type ExchangeRateSyncResult,
  type StoredExchangeRate,
} from "@/lib/exchange-rate-runner";

interface RouteDependencies {
  env?: Partial<Record<"EXCHANGE_RATE_CRON_SECRET", string>>;
  runJob?: () => Promise<ExchangeRateSyncResult>;
}

function getCronSecret(deps?: RouteDependencies) {
  return (
    deps?.env?.EXCHANGE_RATE_CRON_SECRET ??
    process.env.EXCHANGE_RATE_CRON_SECRET
  );
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

async function storeExchangeRates(rates: StoredExchangeRate[]) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("exchange_rates").upsert(
    rates.map((rate) => ({
      base_currency: rate.base_currency,
      target_currency: rate.target_currency,
      rate: rate.rate,
      source: "fixer",
      fetched_at: rate.fetched_at,
    })),
    { onConflict: "base_currency,target_currency" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return rates.length;
}

async function runDefaultJob() {
  return runExchangeRateSyncJob({
    storeRates: storeExchangeRates,
  });
}

export async function handleExchangeRateSyncRequest(
  request: Request,
  deps?: RouteDependencies
) {
  const cronSecret = getCronSecret(deps);
  const token = readBearerToken(request);

  if (!cronSecret || token !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await (deps?.runJob ?? runDefaultJob)();
    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Exchange rate sync failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleExchangeRateSyncRequest(request);
}
```

- [ ] **Step 5: Add the Supabase migration**

Create `supabase/003_create_exchange_rates.sql`:

```sql
-- 003_create_exchange_rates.sql
-- Cache normalized exchange rates for dashboard reporting.

create table if not exists exchange_rates (
  base_currency   text           not null,
  target_currency text           not null,
  rate            numeric(18, 8) not null check (rate > 0),
  source          text           not null default 'fixer',
  fetched_at      timestamptz    not null,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now(),
  primary key (base_currency, target_currency)
);

create index if not exists idx_exchange_rates_target_currency
  on exchange_rates (target_currency);

create trigger trg_exchange_rates_updated_at
  before update on exchange_rates
  for each row
  execute function set_updated_at();

alter table exchange_rates enable row level security;

create policy "Authenticated users can read exchange rates"
  on exchange_rates for select
  to authenticated
  using (true);
```

- [ ] **Step 6: Run the route test and verify GREEN**

Run:

```bash
node --loader ./test/ts-alias-loader.mjs test/exchange-rate-route.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

Run:

```bash
git add package.json src/app/api/exchange-rates/sync/route.ts supabase/003_create_exchange_rates.sql test/exchange-rate-route.test.ts
git commit -m "Add exchange rate sync route"
```

### Task 5: Dashboard Rate Loading and CNY UI

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/StatsCards.tsx`
- Modify: `src/components/CategoryChart.tsx`
- Modify: `src/components/ForecastChart.tsx`

- [ ] **Step 1: Run focused tests before UI edits**

Run:

```bash
npm run test
```

Expected: PASS before UI wiring begins.

- [ ] **Step 2: Load exchange rates in the dashboard page**

Modify `src/app/page.tsx` imports:

```ts
import { buildExchangeRateMap, type ExchangeRateMap, type ExchangeRateRow } from "@/lib/exchange-rates";
```

Add state and loader:

```ts
const [exchangeRates, setExchangeRates] = useState<ExchangeRateMap>({ CNY: 1 });

const loadExchangeRates = useCallback(async () => {
  const supabase = createBrowserClient();
  const { data } = await supabase
    .from("exchange_rates")
    .select("base_currency,target_currency,rate,fetched_at")
    .eq("target_currency", "CNY");

  setExchangeRates(buildExchangeRateMap((data ?? []) as ExchangeRateRow[]));
}, []);
```

Call it when the page mounts and after subscription changes:

```ts
useEffect(() => {
  void loadExchangeRates();
}, [loadExchangeRates, refreshTrigger]);
```

Pass rates into dashboard components:

```tsx
<StatsCards subscriptions={subscriptions} exchangeRates={exchangeRates} />
<CategoryChart subscriptions={subscriptions} exchangeRates={exchangeRates} />
<ForecastChart subscriptions={subscriptions} exchangeRates={exchangeRates} />
```

- [ ] **Step 3: Update the stats cards**

Modify `src/components/StatsCards.tsx` props and hook call:

```ts
import type { ExchangeRateMap } from "@/lib/exchange-rates";

interface StatsCardsProps {
  subscriptions?: Subscription[];
  exchangeRates?: ExchangeRateMap;
}

export function StatsCards({
  subscriptions = [],
  exchangeRates = { CNY: 1 },
}: StatsCardsProps) {
  const {
    monthlyTotal,
    yearlyTotal,
    currentMonthTotal,
    previousMonthTotal,
    growthRate,
    reportingCurrency,
    missingRateCurrencies,
  } = useSubscriptionStats(subscriptions, exchangeRates);
```

Format aggregate values with `reportingCurrency`:

```ts
value: formatMoney(monthlyTotal, reportingCurrency),
value: formatMoney(yearlyTotal, reportingCurrency),
sub: `${formatMoney(previousMonthTotal, reportingCurrency)} -> ${formatMoney(currentMonthTotal, reportingCurrency)}`,
```

Render a small warning after the cards when rates are missing:

```tsx
{missingRateCurrencies.length > 0 && (
  <p className="mt-3 text-[12px] text-amber-300">
    汇率未更新：{missingRateCurrencies.join(", ")} 暂按原金额计入。
  </p>
)}
```

- [ ] **Step 4: Update category and forecast charts**

Modify `src/components/CategoryChart.tsx` and `src/components/ForecastChart.tsx` props:

```ts
import type { ExchangeRateMap } from "@/lib/exchange-rates";

interface CategoryChartProps {
  subscriptions?: Subscription[];
  exchangeRates?: ExchangeRateMap;
}
```

Use:

```ts
const {
  categoryBreakdown: data,
  monthlyTotal: total,
  reportingCurrency,
} = useSubscriptionStats(subscriptions, exchangeRates);
```

Pass `reportingCurrency` into tooltip content and format calls:

```tsx
{formatMoney(Number(value), reportingCurrency)}
{formatMoney(total, reportingCurrency).replace(".00", "")}
```

In `ForecastChart`, use:

```ts
const { monthlyForecast: data, reportingCurrency } =
  useSubscriptionStats(subscriptions, exchangeRates);
```

Update the Y axis formatter:

```tsx
tickFormatter={(value) => formatMoney(Number(value), reportingCurrency).replace(".00", "")}
```

- [ ] **Step 5: Verify UI wiring**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit successfully.

- [ ] **Step 6: Commit Task 5**

Run:

```bash
git add src/app/page.tsx src/components/StatsCards.tsx src/components/CategoryChart.tsx src/components/ForecastChart.tsx
git commit -m "Show dashboard totals in CNY"
```

### Task 6: Documentation and Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update environment variable documentation**

In `README.md`, add fake Fixer values to the `.env.local` example:

```bash
FIXER_API_KEY=fixer_fake_api_key
EXCHANGE_RATE_CRON_SECRET=replace-with-a-long-random-secret
```

Add text:

```md
`FIXER_API_KEY` and `EXCHANGE_RATE_CRON_SECRET` are server-only values. Do not prefix them with `NEXT_PUBLIC_`.
```

- [ ] **Step 2: Update database setup documentation**

Add the new migration to the SQL setup list:

```bash
supabase/001_create_subscriptions.sql
supabase/002_add_email_notifications.sql
supabase/003_create_exchange_rates.sql
```

Add a sentence:

```md
The exchange-rate migration creates a shared `exchange_rates` table that authenticated users can read and the scheduled service-role job can update.
```

- [ ] **Step 3: Document the daily exchange-rate sync**

Add a section near scheduled reminders:

````md
### Configure daily exchange-rate sync

Create a Supabase scheduled job or hosting cron that sends a daily POST request to:

```text
https://your-app.example.com/api/exchange-rates/sync
```

Include this header:

```text
Authorization: Bearer <EXCHANGE_RATE_CRON_SECRET>
```

The endpoint stores normalized conversion rates into CNY and returns only aggregate counts.
````

- [ ] **Step 4: Run final verification**

Run:

```bash
npm run test
npm run lint
npm run build
git -c safe.directory=D:/project/subscription-tracker status --short
```

Expected:

- Tests pass.
- Lint passes.
- Build passes.
- Git status shows only intended committed changes or is clean.

- [ ] **Step 5: Commit Task 6**

Run:

```bash
git add README.md
git commit -m "Document exchange rate sync setup"
```

## Self-Review Notes

- Spec coverage: the plan covers the CNY fixed reporting currency, cached Supabase exchange rates, Fixer normalization, protected daily sync, missing-rate fallback, dashboard CNY UI, README setup, and verification commands.
- Scope check: user-selectable reporting currency, historical rates, manual editing, and additional currencies remain out of scope.
- Type consistency: rate rows use `base_currency`, `target_currency`, `rate`, and `fetched_at` across helpers, runner, route, migration, and dashboard loading.
