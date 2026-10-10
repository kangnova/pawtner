# Pawtner — Specification (MVP)

## 1. Problem

Small Indonesian pet shops (the ~65% of a growing pet-care market that is still offline) manage their business on WhatsApp and paper. They need:

- Inventory that tracks **expiry dates** (pet food expires; generic POS tools ignore this).
- Multi-unit sales (kg, gram, piece, "renteng"/bundle).
- Customer + **pet profiles** (species, breed, age, weight) to recommend and remind.
- A way to sell and take orders without building a website.
- Recurring revenue via **subscriptions/reorder** ("langganan") for food and litter.

## 2. Users & roles

| Role | Capabilities |
|------|--------------|
| OWNER | Full store control, billing, staff management |
| STAFF | Daily ops: sales, products, customers, subscriptions |
| ADMIN | Platform-level admin (promote/demote, cross-store support) |

A user belongs to at most one store (`User.storeId`). ADMIN users are platform-level and not tied to a store.

## 3. Data model

See `prisma/schema.prisma`. Core entities:

- **Store** — the tenant. `slug` unique, `whatsappNumber` for WA ordering.
- **User** — email + passwordHash, `role` (OWNER/STAFF/ADMIN), optional `storeId`.
- **Category** — product grouping per store.
- **Product** — name, sku/barcode, `unit` (PCS/KG/GRAM/LITER/RENTENG), `price`, `costPrice`, `minStockThreshold`.
- **Batch** — per-product stock lots with `quantity` + `expiryDate` (the expiry-tracking core).
- **Customer** — name, phone, email, per store.
- **Pet** — name, `species`, breed, birthDate, weightKg, belongs to a customer.
- **Sale** — invoiceNumber, status (DRAFT/PAID/CANCELLED), paymentMethod, total.
- **SaleItem** — product, quantity, unitPrice, subtotal.
- **Subscription** — product + customer + `frequencyDays` + `quantity` + `discountPct` + status (ACTIVE/PAUSED/CANCELLED) + `nextRunAt`.

## 4. Business rules

- **Stock** is derived from `Batch.quantity` sums per product. A sale decrements the oldest (FIFO) non-expired batch. Low-stock warning when total < `minStockThreshold`; expiry warning when a batch's `expiryDate` is within N days.
- **Expiry** is never ignored: expired batches are excluded from sellable stock and surfaced for write-off.
- **Money** is stored as `Decimal(12,2)`; totals are summed at full precision and rounded once at the end (line items rounded for display, never re-summed).
- **Authorization** = `user.role`, enforced in page + API. No secret-URL/backdoor-password gates. Promote via a `make-admin` script.
- **Subscriptions**: `nextRunAt = lastRunAt + frequencyDays`; status PAUSED stops scheduling without deleting history; reorder reminders derive from `Pet.weightKg` + product pack size (MVP: manual interval).

## 5. API surface (route handlers, JSON)

- `POST /api/auth/register`, NextAuth credentials sign-in/sign-out.
- `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/[id]`
- `GET/POST /api/batches`, `PATCH /api/batches/[id]` (quantity/expiry)
- `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/[id]`
- `GET/POST /api/pets`
- `GET/POST /api/sales`, `GET /api/sales/[id]`
- `GET/POST /api/subscriptions`, `PATCH /api/subscriptions/[id]` (pause/cancel)
- Response shape: shared `ok()/fail()` helper → `{ ok: true, data }` / `{ ok: false, error }`.

All store-scoped routes filter by the authenticated user's `storeId` (except ADMIN).

## 6. Testing

- Vitest: unit tests for `src/lib` (stock FIFO, expiry filtering, totals rounding, subscription scheduling).
- Playwright: smoke test — register owner → create product → create batch → create sale → stock decrements correctly.

## 7. Non-functional

- Single tenant per user in MVP; multi-branch later.
- i18n-ready: UI copy starts English, Indonesian (`id`) added via `next-intl` in v1.
- Deploy target: Vercel + Neon (per user standard), or self-hosted VPS.
