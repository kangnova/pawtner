# Pawtner

The petshop owner's partner — a B2B SaaS that helps Indonesian pet shop owners run their store: point-of-sale, inventory with expiry tracking, a customer-facing store page, WhatsApp ordering, and subscriptions/reorder reminders.

## Why

Indonesia's pet care market is growing (cat-led, urban, "pet humanization"), but ~65% of sales still happen offline, and most small pet shops still run on WhatsApp + pen-and-paper. Pawtner gives them the tools to professionalize without hiring a developer.

The recurring-purchase problem is the moat: pet food and cat litter run out on a schedule. Chewy earns ~84% of net sales from Autoship. Pawtner brings that same "subscribe & never run out" mechanic to Indonesian corner pet shops — plus the things local shops uniquely need (expiry tracking, multi-unit sales, WhatsApp checkout).

## Stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Prisma 6 + PostgreSQL
- Zod + TanStack Query
- NextAuth.js (credentials, JWT sessions)
- Recharts
- Vitest / Playwright

## Architecture

Monorepo-free single Next.js app (App Router):

- `src/app` — pages (dashboard, products, customers, sales, subscriptions, public storefront)
- `src/app/api` — route handlers (REST-ish JSON)
- `src/lib` — Prisma client, auth, business logic (payroll-style pure functions kept here for testability)
- `prisma/schema.prisma` — data model (see docs/SPEC.md)

## Roadmap

- MVP: auth (owner/staff/admin), store setup, product catalog with batches + expiry, customers + pet profiles, point-of-sale sales, inventory thresholds.
- v1: subscriptions (frequency + discount + next-run), WhatsApp order link, public storefront, reorder reminders.
- v2: analytics dashboard (Recharts), multi-branch, loyalty points, supplier/restock workflow.

## Getting started

```bash
docker compose up -d          # PostgreSQL on :5436
npx prisma migrate dev        # apply schema + generate client
npm run dev                   # http://localhost:3000
```

See docs/SPEC.md for the full data model and business rules.
