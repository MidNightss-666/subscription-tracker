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
