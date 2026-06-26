# Exchange Rates and CNY Reporting Design

## Goal

Use Fixer to refresh currency exchange rates once per day, then use the cached rates to normalize subscription totals into CNY. Users can keep entering subscriptions in their original currency, while dashboard totals, category breakdowns, and forecasts report a single CNY view.

The first implementation should support the currencies already present in the form: `USD`, `CNY`, `EUR`, `GBP`, and `JPY`.

## Existing Context

The app is a Next.js 16 App Router project with Supabase-backed subscription data. Subscription CRUD currently happens from client components through the Supabase browser client. The `subscriptions` table already stores `price` and `currency`.

Stats are derived in `src/hooks/useSubscriptionStats.ts` and helpers in `src/lib/subscriptions.ts`. Today those helpers sum nominal values directly, so `10 USD + 10 CNY` becomes `20 USD` in the UI. The statistics components format totals with the default currency, so they also need to become explicit about CNY.

The project already has a protected scheduled-task pattern in `POST /api/reminders/send`: it reads a bearer token, runs a server-side job, and returns aggregate counts only. The exchange-rate sync should follow that same shape.

The repository has a real `.env.local` file. Implementation must not read it. New environment variables will be documented with fake values only.

## User Experience

The subscription form remains focused on the original billing currency. Users still choose one of:

- `USD`
- `CNY`
- `EUR`
- `GBP`
- `JPY`

Dashboard reporting changes to CNY:

- Monthly total is shown in CNY.
- Yearly estimate is shown in CNY.
- Current-month and previous-month comparison is shown in CNY.
- Category chart values and percentages are based on converted CNY amounts.
- Six-month forecast values are based on converted CNY amounts.

The subscription list can continue to show each subscription in its original currency. That preserves the real billing amount and avoids hiding what the vendor actually charges.

If exchange rates have not been synced yet, the dashboard should still render. CNY subscriptions use a rate of `1`. Other currencies can temporarily fall back to their nominal amount with a small non-blocking warning near the dashboard stats, such as "Exchange rates not updated yet." This keeps the app usable while making the degraded state visible.

## Data Model

Add a Supabase migration for an `exchange_rates` table:

- `base_currency text not null`
- `target_currency text not null`
- `rate numeric(18, 8) not null check (rate > 0)`
- `source text not null default 'fixer'`
- `fetched_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Use `(base_currency, target_currency)` as the primary key. For this feature, rows represent conversion from the subscription currency into CNY:

- `CNY -> CNY = 1`
- `USD -> CNY = ...`
- `EUR -> CNY = ...`
- `GBP -> CNY = ...`
- `JPY -> CNY = ...`

This orientation makes client-side conversion straightforward:

```ts
converted = amount * rateByCurrency[currency]
```

RLS should allow authenticated users to read exchange rates. Writes should be performed only by a service role through the scheduled sync route.

## Fixer Integration

Create a server-only exchange-rate provider module:

- `fetchFixerRates(input)` calls Fixer with a server-side API key.
- It requests the supported subscription currencies.
- It returns normalized `CurrencyRate` records whose `target_currency` is `CNY`.

The provider boundary should hide Fixer's response shape from the rest of the app. If Fixer returns rates against a provider-selected base currency, normalize them before storage. For example, if the response contains `rates.CNY` and `rates.USD` against the same base, then `USD -> CNY` is `rates.CNY / rates.USD`. This keeps the database and dashboard independent from Fixer plan details.

Required environment variables:

- `FIXER_API_KEY`
- `EXCHANGE_RATE_CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

Example local variables, with fake values:

```bash
FIXER_API_KEY=fixer_fake_api_key
EXCHANGE_RATE_CRON_SECRET=replace-with-a-long-random-secret
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Fixer credentials must never be exposed to browser code and must not use the `NEXT_PUBLIC_` prefix.

## Scheduled Sync

Add a reusable runner:

- `runExchangeRateSyncJob(deps)` fetches current rates and stores them.
- It always includes `CNY -> CNY = 1`.
- It upserts rows in `exchange_rates`.
- It returns aggregate counts, not raw secrets or private user data.

Add a protected route:

- `POST /api/exchange-rates/sync`
- Requires `Authorization: Bearer <EXCHANGE_RATE_CRON_SECRET>`
- Returns aggregate sync status, for example `{ fetched: 5, stored: 5 }`
- Returns `401` for missing or invalid tokens.
- Returns `500` with a generic message if the provider or database write fails.

Production scheduling should mirror reminders: configure a Supabase scheduled job, hosting cron, or similar scheduler to call the route once per day.

## Statistics Conversion

Introduce a small exchange-rate shape shared by stats helpers and tests:

```ts
export type ExchangeRateMap = Record<string, number>;
```

Stats helpers should receive the rate map and reporting currency:

- `getConvertedAmount(sub, rates)` converts a subscription price into CNY.
- `getMonthlyAmount(sub, rates)` applies billing-cycle normalization after conversion, or equivalently converts the already-normalized monthly amount.
- `getCategoryBreakdown(subs, rates)` groups converted monthly values.
- Forecast calculations use converted charge amounts for each scheduled billing month.

The reporting currency is fixed to `CNY` for this feature. UI calls to `formatMoney()` for aggregate statistics should pass `"CNY"` explicitly.

## Loading Rates in the App

The dashboard should load exchange rates from Supabase alongside subscriptions. Because exchange rates are shared reference data, the browser client can read them under RLS once the migration grants authenticated read access.

`Home` can keep subscription state and add exchange-rate state:

- `SubscriptionList` continues to load subscription rows.
- A new hook or helper loads the current exchange-rate rows.
- `StatsCards`, `CategoryChart`, and `ForecastChart` receive the rate map.

Keep this narrow. There is no user-configurable reporting currency in the first version.

## Error Handling

Provider errors:

- Missing `FIXER_API_KEY` should fail the sync job with a clear server-side configuration error.
- Fixer request failures should not delete old rates.
- The route should return a generic failure response and avoid leaking provider details.

Stale or missing rates:

- Existing cached rates remain usable until the next successful sync.
- CNY always has a hardcoded fallback rate of `1`.
- Other missing currencies are reported as unavailable to the UI while using a conservative nominal fallback so charts do not crash.

Invalid rates:

- Reject zero, negative, `NaN`, or non-finite rates before storing.
- Round displayed money values to two decimals only at display or aggregate boundaries.

## Testing

Use TDD for behavior changes:

- Conversion helper converts supported currencies into CNY and treats CNY as `1`.
- Monthly/yearly normalization uses converted CNY amounts.
- Category breakdown and forecast aggregate converted values.
- Missing non-CNY rates do not crash and surface a degraded-rate signal.
- Exchange-rate sync runner stores valid provider rates and includes `CNY -> CNY`.
- Exchange-rate route rejects missing or invalid cron secrets.
- Exchange-rate route runs the job for valid bearer tokens.

Run the project's test script, lint, and build after implementation.

## Documentation

Update the README to document:

- `FIXER_API_KEY`
- `EXCHANGE_RATE_CRON_SECRET`
- The new Supabase migration.
- The daily scheduled call to `POST /api/exchange-rates/sync`.
- Dashboard statistics are reported in CNY while subscription rows keep their original currency.

## Out of Scope

- User-selectable reporting currency.
- Historical rate snapshots per billing event.
- Backfilling historical spending with past daily rates.
- Manual rate editing in the UI.
- Adding currencies beyond the current form options.
