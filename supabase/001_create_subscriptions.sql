-- 001_create_subscriptions.sql
-- Supabase (PostgreSQL) migration: subscriptions table

-- 1. Custom enum type
create type billing_cycle as enum ('monthly', 'yearly');

-- 2. Main table
create table subscriptions (
  id                uuid           primary key default gen_random_uuid(),
  user_id           uuid           not null references auth.users(id) on delete cascade,
  name              text           not null,
  price             numeric(10, 2) not null check (price >= 0),
  currency          text           not null default 'USD',
  billing_cycle     billing_cycle  not null default 'monthly',
  category          text           not null default '其他',
  start_date        date           not null default current_date,
  next_billing_date date           not null,
  created_at        timestamptz    not null default now(),
  updated_at        timestamptz    not null default now()
);

-- 3. Indexes
create index idx_subscriptions_user_id on subscriptions (user_id);
create index idx_subscriptions_next_bill on subscriptions (next_billing_date);

-- 4. Auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row
  execute function set_updated_at();

-- 5. Row Level Security (RLS)
alter table subscriptions enable row level security;

create policy "Users can read their own subscriptions"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
  on subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions"
  on subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
  on subscriptions for delete
  using (auth.uid() = user_id);

-- 6. Optional helper: calculate a user's normalized monthly total
create or replace function get_monthly_total(p_user_id uuid)
returns numeric as $$
  select coalesce(sum(
    case billing_cycle
      when 'yearly' then round(price / 12, 2)
      when 'monthly' then price
    end
  ), 0)
  from subscriptions
  where user_id = p_user_id;
$$ language sql stable;

-- 7. Optional helper: check whether an email already exists in Supabase Auth
create or replace function is_email_registered(p_email text)
returns boolean
security definer
set search_path = auth, public
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_email))
  );
$$ language sql stable;

grant execute on function is_email_registered(text) to anon, authenticated;
