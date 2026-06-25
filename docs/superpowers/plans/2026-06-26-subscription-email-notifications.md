# Subscription Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-subscription email reminder settings, a protected scheduled reminder sender, and documentation for Supabase setup.

**Architecture:** Keep reminder date rules in a shared pure module, so client validation and server sending use the same period-bound logic. Use a Next.js Route Handler as the protected scheduled endpoint and Resend's REST API from server-only code. Store reminder settings on the existing `subscriptions` rows.

**Tech Stack:** Next.js 16 App Router, React Hook Form, Zod, Supabase PostgreSQL, Supabase JS, Node built-in test runner, Resend REST API.

---

## File Structure

- Create `src/lib/reminders.ts`: pure reminder-period and due-date helpers.
- Create `test/reminders.test.ts`: Node test coverage for monthly/yearly lead-day rules and due selection.
- Modify `src/lib/validation.ts`: add reminder form fields and dynamic lead-day validation.
- Create `test/validation.test.ts`: validation coverage for period-specific caps.
- Modify `src/lib/subscriptions.ts`: extend `Subscription` with reminder columns.
- Modify `src/components/SubscriptionForm.tsx`: add reminder switch and lead-day input, save reminder fields.
- Modify `src/components/SubscriptionList.tsx`: show compact reminder status.
- Create `src/lib/email/reminder.ts`: Resend REST sender with injectable environment and fetch.
- Create `test/email-reminder.test.ts`: missing config and successful send coverage.
- Create `src/lib/reminder-runner.ts`: query due subscriptions, send reminders, update successful rows.
- Create `test/reminder-runner.test.ts`: selection/send/update behavior with fake dependencies.
- Create `src/app/api/reminders/send/route.ts`: protected POST endpoint for Supabase Cron.
- Create `test/reminder-route.test.ts`: cron-secret authorization tests.
- Create `supabase/002_add_email_notifications.sql`: database migration.
- Modify `README.md`: environment variables, Supabase SQL, cron instructions.
- Modify `AGENTS.md`: durable instruction forbidding `.env` reads unless explicitly requested.
- Modify `package.json`: add a `test` script using Node's built-in test runner.

## Tasks

### Task 1: Shared Reminder Rules

- [ ] Write `test/reminders.test.ts` with failing tests for actual monthly and yearly period caps.
- [ ] Run `node --test test/reminders.test.ts` and confirm missing module/function failures.
- [ ] Implement `src/lib/reminders.ts` with UTC date parsing, month/year subtraction, `getBillingPeriodDays`, `validateNotifyDaysBefore`, `getReminderDate`, and `isReminderDue`.
- [ ] Run `node --test test/reminders.test.ts` and confirm passing tests.

### Task 2: Form Validation

- [ ] Write `test/validation.test.ts` covering enabled reminder validation, disabled reminders, monthly over-cap rejection, and leap-year yearly caps.
- [ ] Run `node --test test/validation.test.ts` and confirm failures.
- [ ] Update `src/lib/validation.ts` to add `email_notifications_enabled` and `notify_days_before` with `superRefine` using `validateNotifyDaysBefore`.
- [ ] Run validation and reminder tests.

### Task 3: UI and Types

- [ ] Extend `Subscription` in `src/lib/subscriptions.ts`.
- [ ] Update `src/components/SubscriptionForm.tsx` defaults, payload, and UI controls.
- [ ] Update `src/components/SubscriptionList.tsx` to display reminder status on desktop and mobile.
- [ ] Run `npm run lint`.

### Task 4: Email Sender and Reminder Runner

- [ ] Write `test/email-reminder.test.ts` for missing config and successful Resend request.
- [ ] Implement `src/lib/email/reminder.ts`.
- [ ] Write `test/reminder-runner.test.ts` for sending due reminders and updating only successful sends.
- [ ] Implement `src/lib/reminder-runner.ts`.
- [ ] Run email, runner, reminder, and validation tests.

### Task 5: Protected Route Handler

- [ ] Write `test/reminder-route.test.ts` for missing, wrong, and correct bearer tokens.
- [ ] Implement `src/app/api/reminders/send/route.ts` with `POST` only behavior from route exports and no private data in responses.
- [ ] Run route tests.

### Task 6: Supabase, README, and Agent Safety

- [ ] Add `supabase/002_add_email_notifications.sql` with columns and check constraint.
- [ ] Update `README.md` with fake environment variable examples and Supabase management steps.
- [ ] Update `AGENTS.md` to forbid agent reads of `.env` and `.env.*` unless the user explicitly requests it.
- [ ] Run `npm run test`, `npm run lint`, and `npm run build`.
