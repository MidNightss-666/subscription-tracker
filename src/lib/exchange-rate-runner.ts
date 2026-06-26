import "server-only";

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

  const fetchedAt = payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString();

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
    if (rate.target_currency !== "CNY" || !validateExchangeRate(Number(rate.rate))) {
      throw new Error(`Invalid exchange rate for ${rate.base_currency}`);
    }
  }

  const stored = await storeRates(rates);

  return {
    fetched: rates.length,
    stored,
  };
}
