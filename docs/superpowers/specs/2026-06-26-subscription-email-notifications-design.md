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

Validation will require a whole number from `0` to `365` when reminders are enabled. When reminders are disabled, the stored lead time may remain set for later reuse, but no reminder will be sent.

The subscription list will show a compact reminder status so users can see which subscriptions have reminders enabled without opening the edit dialog.

## Data Model

Add a Supabase migration with these columns on `subscriptions`:

- `email_notifications_enabled boolean not null default false`
- `notify_days_before integer not null default 3`
- `last_notification_sent_at timestamptz`

Add a check constraint:

- `notify_days_before >= 0 and notify_days_before <= 365`

The existing RLS policies still apply because reminder settings live on each user's subscription rows. The scheduled sender will need privileged access through a service role key or a Supabase Edge Function environment where it can query across users.

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
- Due-reminder selection includes due subscriptions and excludes disabled, future, and already-sent subscriptions.
- The route rejects missing or invalid cron secrets.
- The email provider reports missing configuration without sending.

Run the project's lint/build verification after implementation.

## Out of Scope

- A full email template editor.
- Multiple reminder schedules per subscription.
- Delivery analytics beyond `last_notification_sent_at`.
- Automatic advancement of `next_billing_date` after payment.
