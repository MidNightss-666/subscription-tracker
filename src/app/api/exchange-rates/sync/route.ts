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
    return Response.json({ fetched: result.fetched, stored: result.stored });
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
