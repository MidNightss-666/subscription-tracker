-- 002_add_email_notifications.sql
-- Add per-subscription email reminder settings.

alter table subscriptions
  add column if not exists email_notifications_enabled boolean not null default false,
  add column if not exists notify_days_before integer not null default 3,
  add column if not exists last_notification_sent_at timestamptz;

alter table subscriptions
  add constraint subscriptions_notify_days_before_range
  check (notify_days_before >= 0 and notify_days_before <= 366);

create index if not exists idx_subscriptions_email_notifications
  on subscriptions (email_notifications_enabled, next_billing_date)
  where email_notifications_enabled = true;
