# SubTrack

A personal subscription management dashboard. Track recurring expenses, visualize monthly spending, and stay on top of upcoming renewals.

> This project is a personal side project built with **vibe coding**, an experimental, intuition-driven approach to development. It is not affiliated with any organization and is intended for personal use and learning.

## Features

- **Authentication**: Email/password sign-up and login via Supabase Auth
- **Subscription CRUD**: Add, edit, list, and delete recurring subscriptions
- **Dashboard**: Monthly/yearly totals, real month-over-month change, and category breakdown
- **Donut chart**: Category spending distribution in a focused dark dashboard
- **Bar chart**: 6-month calendar forecast of expected billing
- **Responsive UI**: Table layout on desktop and scan-friendly cards on mobile

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd subscription-tracker
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_123456789_fake_example
REMINDER_EMAIL_FROM=SubTrack <notifications@example.com>
SUBSCRIPTION_REMINDER_CRON_SECRET=replace-with-a-long-random-secret
FIXER_API_KEY=fixer_fake_api_key
EXCHANGE_RATE_CRON_SECRET=replace-with-a-long-random-secret
```

You can find these values in your Supabase dashboard under **Settings > API**.
`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported as an alias for the publishable key.
`SUPABASE_SERVICE_ROLE_KEY` is required only on the server for the scheduled reminder sender. Never expose it to browser code.
`FIXER_API_KEY` and `EXCHANGE_RATE_CRON_SECRET` are server-only values. Do not prefix them with `NEXT_PUBLIC_`.

Create the Resend API key in Resend, and use a verified sender domain or sender address for `REMINDER_EMAIL_FROM`.

For email confirmation, add these redirect URLs in Supabase Auth:

```text
http://localhost:3000/auth/confirm
http://localhost:3000/auth/callback
```

### 3. Set up the database

Run the SQL migration in your Supabase SQL Editor:

```bash
supabase/001_create_subscriptions.sql
supabase/002_add_email_notifications.sql
supabase/003_create_exchange_rates.sql
```

This creates the `subscriptions` table, indexes, RLS policies, helper functions, and email reminder columns.
The exchange-rate migration creates a shared `exchange_rates` table that authenticated users can read and the scheduled service-role job can update.

### 4. Configure scheduled reminders

Deploy the app, then create a Supabase scheduled job that sends a daily POST request to:

```text
https://your-app.example.com/api/reminders/send
```

Include this header:

```text
Authorization: Bearer <SUBSCRIPTION_REMINDER_CRON_SECRET>
```

The endpoint returns only aggregate counts (`checked`, `due`, `sent`, `failed`) and does not expose subscription details.

### Configure daily exchange-rate sync

Create a Supabase scheduled job or hosting cron that sends a daily POST request to:

```text
https://your-app.example.com/api/exchange-rates/sync
```

Include this header:

```text
Authorization: Bearer <EXCHANGE_RATE_CRON_SECRET>
```

The endpoint stores normalized conversion rates into CNY and returns only aggregate counts.
Dashboard statistics are reported in CNY while subscription rows keep their original currency.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login` to create an account.

## Deployment

The app can be deployed to any platform that supports Next.js App Router, such as Vercel or Netlify.

1. Set the Supabase, Resend, sender, `SUBSCRIPTION_REMINDER_CRON_SECRET`, `FIXER_API_KEY`, and `EXCHANGE_RATE_CRON_SECRET` environment variables in your hosting provider's dashboard.
2. Ensure the Supabase database migration has been applied.
3. Configure the Supabase scheduled job to call the deployed reminder endpoint once per day.
4. Configure a daily scheduled job or hosting cron to send `POST /api/exchange-rates/sync` with `Authorization: Bearer <EXCHANGE_RATE_CRON_SECRET>`.
5. Deploy. No additional build configuration is needed.

```bash
npm run build
npm start
```

## Project Structure

```text
src/
  app/
    page.tsx              # Main dashboard
    login/page.tsx        # Login / sign-up
    auth/callback/        # OAuth callback handler
    proxy.ts             # Auth session refresh & route protection
  components/
    SubscriptionForm.tsx  # Add / edit form
    SubscriptionList.tsx  # Data table and mobile cards
    StatsCards.tsx        # Monthly, yearly, and MoM stats
    CategoryChart.tsx     # Donut chart
    ForecastChart.tsx     # 6-month bar chart
  hooks/
    useSubscriptionStats.ts  # Derived stats from subscription data
  lib/
    supabase/
      client.ts           # Browser Supabase client
      server.ts           # Server Supabase client
      middleware.ts       # Session refresh logic
    subscriptions.ts      # Types and utilities
    validation.ts         # Zod form schema
supabase/
  001_create_subscriptions.sql  # DB migration
```

## License

Personal project. No license; not intended for redistribution.
