# SubTrack

A personal subscription management dashboard. Track recurring expenses, visualize monthly spending, and stay on top of every subscription.

> This project is a personal side project built with **vibe coding** — an experimental, intuition-driven approach to development. It is not affiliated with any organization and is intended for personal use and learning.

## Features

- **Authentication** — Email/password sign-up and login via Supabase Auth
- **Subscription CRUD** — Add, edit, and manage recurring subscriptions
- **Dashboard** — Monthly/yearly totals, growth rate, and category breakdown at a glance
- **Donut Chart** — Category spending distribution with a purple/cyan/indigo dark-mode palette
- **Bar Chart** — 6-month forecast of expected billing based on `next_billing_date`
- **Responsive** — Works on both desktop and mobile screens

## Tech Stack

| Layer | Technology |
|-------|-----------|
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
```

You can find these values in your Supabase dashboard under **Settings > API**.

### 3. Set up the database

Run the SQL migration in your Supabase SQL Editor:

```bash
supabase/001_create_subscriptions.sql
```

This creates the `subscriptions` table, indexes, RLS policies, and a helper function.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login` to create an account.

## Deployment

The app can be deployed to any platform that supports Next.js App Router (Vercel, Netlify, etc.).

1. Set the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) in your hosting provider's dashboard.
2. Ensure the Supabase database migration has been applied.
3. Deploy — no additional build configuration is needed.

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/
    page.tsx              # Main dashboard
    login/page.tsx        # Login / sign-up
    auth/callback/        # OAuth callback handler
    middleware.ts         # Auth session refresh & route protection
  components/
    SubscriptionForm.tsx  # Add / edit form
    SubscriptionList.tsx  # Data table
    StatsCards.tsx        # Monthly, yearly, growth stats
    CategoryChart.tsx     # Donut chart
    ForecastChart.tsx     # 6-month bar chart
  hooks/
    useSubscriptionStats.ts  # Derived stats from subscription data
  lib/
    supabase/
      client.ts           # Browser Supabase client
      server.ts           # Server Supabase client
      middleware.ts        # Session refresh logic
    subscriptions.ts      # Types, mock data, utilities
    validation.ts         # Zod form schema
supabase/
  001_create_subscriptions.sql  # DB migration
```

## License

Personal project. No license — not intended for redistribution.
