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
