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
      /Invalid exchange rate/,
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
          }),
        );
      },
    });

    assert.equal(calls[0].includes("access_key=fake_key"), true);
    assert.equal(rates.find((rate) => rate.base_currency === "USD")?.rate, 7.09090909);
    assert.equal(rates.find((rate) => rate.base_currency === "CNY")?.rate, 1);
  });
});
