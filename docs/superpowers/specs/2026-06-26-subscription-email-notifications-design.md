# Subscription Email Notifications Design

## Goal

Allow each subscription to opt into email reminders with its own reminder lead time. A user can enable reminders for one subscription, disable them for another, and choose how many days before the next billing date the reminder should be sent.

The first production-ready path uses Supabase for data and scheduling, with Resend as the email provider. Supabase Auth remains responsible for user identity. Product reminder emails are sent from server-side code only.

## Existing Context

The app is a Next.js 16 App Router project. Subscription CRUD currently happens from client components through the Supabase browser client. The `subscriptions` table stores billing details and is protected by RLS. There is no existing product-email sender or scheduled reminder job.

The project has a real `.env.local` file. Implementation must not read its contents. New environment variables will be documented as examples only.

## User Experience

The add and edit subscription form will include:

- A binary email reminder setting.
- A numeric "days before billing" field shown when reminders are enabled.

The value means:

- `0`: send on the billing date.
- `1`: send one day before.
- `7`: send seven days before.

Validation will require a whole number that stays inside the current billing period when reminders are enabled. The maximum is dynamic:

- For a monthly subscription, it must not exceed the actual number of days in the current monthly period.
- For a yearly subscription, it must not exceed the actual number of days in the current yearly period.

The implementation should calculate the current period from `billing_cycle` and `next_billing_date`, then reject values greater than that period length. This avoids setting a reminder that reaches back past the current renewal period and effectively targets a previous or next renewal node instead of the upcoming billing date. When reminders are disabled, the stored lead time may remain set for later reuse, but no reminder will be sent.

The subscription list will show a compact reminder status so users can see which subscriptions have reminders enabled without opening the edit dialog.

## Data Model

Add a Supabase migration with these columns on `subscriptions`:

- `email_notifications_enabled boolean not null default false`
- `notify_days_before integer not null default 3`
- `last_notification_sent_at timestamptz`

Add a check constraint:

- `notify_days_before >= 0 and notify_days_before <= 366`

The database constraint provides an absolute safety limit for yearly leap-year periods. The app and server reminder logic must enforce the stricter billing-cycle-specific maximum before insert, update, or send.

The existing RLS policies still apply because reminder settings live on each user's subscription rows. The scheduled sender will need privileged access through a service role key or a Supabase Edge Function environment where it can query across users.

## Reminder Lead-Time Validation

Create one shared helper for reminder lead-time rules so the form and server route use the same behavior:

- `getBillingPeriodDays(nextBillingDate, billingCycle)` returns the actual day length of the current period.
- `validateNotifyDaysBefore(value, nextBillingDate, billingCycle)` accepts integers from `0` through that period length.

For monthly subscriptions, the helper should subtract one month from `next_billing_date` to find the current period start and compare calendar dates. Examples:

- `next_billing_date = 2026-03-01`, monthly period start is `2026-02-01`, maximum is `28`.
- `next_billing_date = 2026-05-15`, monthly period start is `2026-04-15`, maximum is `30`.

For yearly subscriptions, subtract one year from `next_billing_date`. Leap-year periods can be `366` days, so the absolute database cap is `366`.

## Reminder Selection

A reminder is due when:

- `email_notifications_enabled = true`
- `next_billing_date - notify_days_before = current_date`
- `last_notification_sent_at` is null or before the current reminder day

After a successful send, update `last_notification_sent_at = now()`. If sending fails, leave the timestamp unchanged so a later run can retry.

This design intentionally sends at most one reminder per subscription per billing cycle and per configured lead time. It does not advance `next_billing_date`; the existing app controls that field.

## Email Sending

Use a server-only email module with a provider boundary:

- `sendSubscriptionReminderEmail(input)` formats and sends one reminder.
- The first provider implementation calls Resend's REST API with `RESEND_API_KEY`.
- The provider is not imported into client components.

Required environment variables:

- `RESEND_API_KEY`
- `REMINDER_EMAIL_FROM`
- `SUBSCRIPTION_REMINDER_CRON_SECRET`
- Supabase service credentials only if the sender runs in a Next Route Handler instead of a Supabase Edge Function.

If Resend is not configured, the sender returns a clear configuration error and sends no email. The UI can still save reminder preferences.

Example local variables, with fake values:

```bash
RESEND_API_KEY=re_123456789_fake_example
REMINDER_EMAIL_FROM=SubTrack <notifications@example.com>
SUBSCRIPTION_REMINDER_CRON_SECRET=replace-with-a-long-random-secret
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is only needed for a Next.js Route Handler that queries due reminders across users. If the scheduled sender runs entirely as a Supabase Edge Function, store the equivalent service credential in Supabase function secrets instead of the Next.js app environment.

## Triggering Strategy

Recommended production setup:

1. Supabase Cron runs once per day.
2. The cron job invokes either:
   - a Supabase Edge Function that sends due reminders, or
   - a Next.js Route Handler protected by `SUBSCRIPTION_REMINDER_CRON_SECRET`.
3. The handler queries due subscriptions, sends reminders, and records successful sends.

For this codebase, the initial implementation should include the reusable sender logic and a protected Next Route Handler because it fits the current App Router project and keeps the code in one repository. The README will document how to trigger it from Supabase.

## Route Handler Security

The reminder route is a public HTTP endpoint, so it must:

- Accept only `POST`.
- Require a bearer token matching `SUBSCRIPTION_REMINDER_CRON_SECRET`.
- Avoid returning private subscription or user data.
- Use server-only environment variables.

Next.js docs note that Route Handlers are public HTTP endpoints and should be treated as API boundaries. This route must verify authorization internally and not rely on UI-level access control.

## Codex `.env` Safety

The repository should add durable instructions that agents must not read `.env`, `.env.*`, or files that are likely to contain secrets unless the user explicitly asks for a specific value. This can be placed in `AGENTS.md`.

That instruction improves collaboration safety but is not a hard sandbox. A stronger option is a project-level Codex hook or config rule if the installed Codex version supports pre-tool-call blocking for file reads. Because the current session's official Codex manual fetch failed with HTTP 403, the implementation should avoid claiming exact supported config keys without later verification from local Codex docs or the user's installed version.

The immediate change should:

- Add `AGENTS.md` guidance forbidding `.env` reads.
- Keep examples in `.env.example` or README without reading `.env.local`.
- Never copy real secret values into docs, tests, commits, or output.

## Testing

Use TDD for behavior changes:

- Validation accepts reminder fields and rejects invalid lead days.
- Validation rejects reminder lead days that exceed the actual monthly or yearly period length.
- Due-reminder selection includes due subscriptions and excludes disabled, future, and already-sent subscriptions.
- The route rejects missing or invalid cron secrets.
- The email provider reports missing configuration without sending.

Run the project's lint/build verification after implementation.

## Out of Scope

- A full email template editor.
- Multiple reminder schedules per subscription.
- Delivery analytics beyond `last_notification_sent_at`.
- Automatic advancement of `next_billing_date` after payment.
