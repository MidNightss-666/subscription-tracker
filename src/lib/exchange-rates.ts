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
