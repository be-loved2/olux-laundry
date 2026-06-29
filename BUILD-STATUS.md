# Build status

Building this module by module, verifying each before moving on, per the
original brief. Updated as we go.

## ✅ Module 1 — Foundation (this session)

- Next.js 16 + TypeScript + Tailwind project scaffold, verified to install,
  type-check, lint, and format clean.
- Full Prisma data model: users/roles, customers, addresses, services,
  price items, delivery zones, orders, order items, order status timeline,
  payments, invoices, delivery riders, reviews, notifications, settings,
  audit logs.
- NextAuth (Auth.js v4) wired up with a Credentials provider + Prisma
  adapter, JWT sessions carrying the user's role.
- Role-based permission matrix (`src/lib/rbac.ts`) covering Super Admin,
  Manager, Receptionist, Laundry Staff, Delivery Rider, Customer.
- Seed script with a super admin, sample services/prices/zones/settings.
- Route-group skeleton for every planned page (public site, auth, customer
  dashboard, admin dashboard).
- **How this was verified**: the sandbox this was built in can't reach
  Prisma's binary CDN, so instead of `prisma migrate dev` the schema was
  hand-translated to SQL and applied to a real local Postgres — all tables,
  enums, foreign keys and indexes created cleanly, and a full
  booking → payment → invoice → delivery → review flow was inserted and
  queried end-to-end, including confirming the one-review-per-order
  constraint correctly rejects a duplicate. Separately, `next build`,
  `tsc --noEmit`, `eslint`, and `prettier --check` all ran clean against the
  real dependency versions. **You should still run `npx prisma migrate dev`
  yourself once you have a real DB connection** — that's what generates the
  actual Prisma Client and migration history this verification stood in for.

## ✅ Module 2 — Authentication

- Register, login, forgot password, reset password, and email verification —
  all with real forms (React Hook Form + Zod), real server actions, and
  real pages (not just API endpoints).
- Password reset uses the standard "always say the same thing" pattern so
  the endpoint can't be used to check which emails are registered.
- Resend wired up with real email templates (`src/emails/`), with a
  console-logging mock fallback when `RESEND_API_KEY` isn't set — so the
  whole flow works locally without a real email provider. Cloudinary and
  Paystack got the same mock-fallback treatment (`src/server/services/`),
  ready for the dashboard and booking modules to use.
- Route protection via `proxy.ts` (Next.js 16 renamed `middleware.ts` →
  `proxy.ts` very recently — worth knowing if you're following older
  tutorials) plus a `getServerSession()` check on every protected page as
  the authoritative second layer.
- Placeholder `/dashboard` and `/admin` landing pages so the role-based
  post-login redirect has somewhere real to go.
- **Verified by**: `tsc`, `eslint`, and `prettier` all clean, and a full
  `next build` that compiles and type-checks successfully, getting all the
  way to the same expected wall as before (no generated Prisma Client in
  this sandbox). The token-based flows (email verification, password reset)
  were also walked through step-by-step against the real local Postgres —
  create → verify → consume, including confirming a used reset token would
  be rejected on replay.

## ✅ Module 3 — Booking flow

- Real 4-step booking wizard (service → items & quantities → pickup details
  & address → review) with a live running total as you go.
- Server-side price recalculation — the server never trusts a client-submitted
  total; it re-fetches each item's price from the database before creating
  the order. Creates the order, order items, an initial status event, an
  invoice, and a notification in one transaction.
- "Track Order" public page (order number + email lookup) doubles as the
  booking confirmation destination, with a real progress timeline that shows
  only the processing stage relevant to the order's service (e.g. an order
  for "Ironing" shows Ironing, not Washing/Dry Cleaning too) — a deliberate
  refinement of the brief's flat status list for a more honest customer-facing
  timeline; the underlying enum still supports any of the listed statuses.
- "Pay now" wired to the Paystack wrapper from Module 2 — real checkout when
  configured, a working mock-checkout page when not, plus a real signature-
  verified webhook handler (`/api/webhooks/paystack`) for live mode.
- **Verified by**: `eslint` and `prettier` clean. `tsc` is clean _except_ for
  ~10 errors in `book-pickup/page.tsx`, `booking.ts`, and `payment.ts` —
  these are all "implicit any" / property-access errors caused by the same
  missing-generated-Prisma-Client issue as before, not real bugs. I manually
  cross-checked every Prisma query in those files against `schema.prisma`
  field-by-field, and separately ran the entire booking → payment →
  confirmation flow as raw SQL against the real local Postgres (price
  lookup → order+items+invoice creation → payment success → order
  CONFIRMED → invoice PAID → status timeline → track-order lookup) — every
  step produced the expected result. These ~10 errors should disappear
  automatically the moment you run `npx prisma generate` for real.

## ✅ Module 4 — Customer dashboard

- Real dashboard shell: sidebar nav (Overview / My Orders / Payments /
  Profile), a notifications bell (mark-all-read on open), sign out — shared
  across every dashboard page via a route-group layout that also handles the
  auth gate in one place.
- **Overview**: active-order count, lifetime order count, lifetime spend,
  and a quick list of active orders.
- **My Orders**: full order history with status badges, linking to a real
  **order detail page** — items breakdown, address, special instructions,
  the same progress timeline from the booking module, a "Pay now" button if
  unpaid, and a real downloadable **PDF invoice** (rendered server-side with
  @react-pdf/renderer — actually rendered and visually checked, not just
  type-checked, since this piece has no Prisma dependency).
- **Reviews**: once an order is `DELIVERED`, the order detail page shows a
  star-rating review form; after submitting, it shows the read-only review
  instead (one review per order, enforced by the database).
- **Payments**: full payment history with status badges, linking back to
  the relevant order.
- **Profile**: edit name/phone, plus a separate change-password form that
  verifies the current password before accepting a new one.
- `totalSpent` on the customer record now actually increments when a
  payment succeeds (was tracked in the schema since Module 1 but never
  written to until now).
- **Verified by**: `eslint`/`prettier` clean, `next build` compiles and
  passes the bundling stage cleanly, `tsc` has the same ~16 known
  implicit-`any` errors as before (missing generated Prisma Client — every
  query was hand-checked against `schema.prisma`). The review, profile
  update, password change, and notification-read flows were each walked
  through as raw SQL against the real database. The invoice PDF was
  actually rendered (not just compiled) and visually inspected — it looks
  right.

## ✅ Module 7 — Payments & Refunds

Most of this module's brief items (Paystack mock integration, payment
records, invoice payment, payment history) were already built in earlier
modules — Module 2 added the mock-fallback Paystack wrapper, Module 3 wired
up checkout + webhook, Module 4 added the customer payment history page and
invoice PDF download. The net-new work this session is refund handling.

### Schema

- **`Refund` model** (`prisma/schema.prisma`) — one row per refund attempt
  against a `Payment`: amount, reason, `RefundStatus` (`PENDING` / `SUCCESS`
  / `FAILED`), a unique mock-Paystack reference, the staff member who
  initiated it, and `processedAt`. A payment can have multiple partial
  refunds; the sum of successful ones is checked against the payment amount
  in the server action (Prisma can't express that as a DB constraint).
- Added `RefundStatus` enum and `REFUND_PROCESSED` to `NotificationType`.
- Added `refunds` relations on `Payment`, `Order`, `Customer`, and
  `refundsInitiated` on `User`.

### New/changed code

- **`src/server/services/paystack.ts`** — `initiateRefund()`, mirroring the
  existing mock-fallback pattern: without `PAYSTACK_SECRET_KEY` it
  instantly mock-succeeds with a generated `OLX-RFD-…` reference; with a key
  configured it calls Paystack's real `/refund` endpoint.
- **`src/server/actions/payment.ts`** — `requestRefundAction(paymentId,
  reason, amountNaira?)`. Permission-gated to the new `payments.refund`
  permission (SUPER_ADMIN + MANAGER only). Validates the payment is
  `SUCCESS`, computes how much is still refundable against prior successful
  refunds, calls the mock/real Paystack refund, then in one transaction:
  records the `Refund`, flips the `Payment` to `REFUNDED` and `Invoice` to
  `VOID` only once the *cumulative* refunded amount reaches the full
  payment amount (a partial refund leaves both as-is, since the order was
  still fulfilled), decrements `Customer.totalSpent`, and notifies the
  customer (`REFUND_PROCESSED`).
- **`src/lib/rbac.ts`** — new `payments.refund` permission.
- **`src/lib/status.ts`** — `refundStatusVariant()` badge helper.
- **`src/components/admin/admin-refund-panel.tsx`** — shown under each
  successful payment on the admin order detail page. Lists prior refunds
  with status badges; if the role has `payments.refund` and the payment
  isn't fully refunded yet, shows an "Issue refund…" form (optional amount
  — blank means "refund what's left" — plus a required reason).
- **`src/app/(admin)/admin/orders/[orderNumber]/page.tsx`** — payments
  section now includes each payment's refund history via the new panel.
- **`src/app/(customer)/dashboard/payments/page.tsx`** — payment history
  now shows the refunded amount and a "Partial refund" badge when
  applicable, alongside the existing status badge.

### Design decisions

- **Partial refunds stay on a `SUCCESS` payment, not a new status**: the
  `PaymentStatus` enum only has one `REFUNDED` value, which the brief and
  schema treat as "this payment is done, the customer got their money
  back." A partial refund doesn't fit that, so the payment stays `SUCCESS`
  and the truth lives in its `Refund` rows — `admin-refund-panel.tsx` and
  the customer payments page both compute "refunded so far" from those
  rows rather than trusting a single status flag.
- **Refund creates a notification but doesn't touch order status**: a
  refund doesn't redefine whether laundry was washed and delivered: it's a
  financial reversal, not a service outcome — so `Order.status` and the
  status timeline are left alone. The reasoning is described inline in the
  server action.
- **No webhook handling for refunds**: in mock mode the action completes
  synchronously, same as the existing checkout flow. In live mode Paystack
  also sends an async `refund.processed` webhook event — not handled here,
  since the booking/payment webhook route only listens for
  `charge.success` today. Worth adding if this goes live with real refunds
  that can take days to clear.

### Verification

- **Could not run `eslint` / `tsc` / `prettier` or anything Postgres-backed
  this session** — this sandbox has no network access and no
  `node_modules` installed, unlike the environment the earlier modules were
  verified in. So, unlike those modules' status notes, I can't claim a
  build/lint/type-check pass or a real database walkthrough for this one.
- What I did instead: read every existing payment-related file
  (`paystack.ts`, `payment.ts`, the admin order detail page, the customer
  payments page, `rbac.ts`, `status.ts`) before writing anything, matched
  existing conventions (mock-fallback pattern, `useTransition` + flash
  message pattern from `admin-order-actions.tsx`, badge variant helpers),
  and hand-traced every new Prisma field/relation against the updated
  schema.
- **You should run `npx prisma migrate dev` (to pick up the new `Refund`
  model/enum), then `npm install`, `npm run lint`, `npx tsc --noEmit`, and
  `npm run build`** before trusting this the way the earlier modules were
  verified. I'd also recommend manually walking one refund through the UI
  against a real database — pay an order, issue a partial refund, confirm
  the payment stays `SUCCESS` and `totalSpent` drops, then refund the rest
  and confirm it flips to `REFUNDED`/`VOID`.

## ⏳ Not started yet

- Public marketing site polish (hero, testimonials, live stats, price
  calculator widget, FAQ, legal pages) — homepage still has a placeholder
  hero; Pricing/Services/About/FAQ/Contact/legal pages aren't built yet.
- Cloudinary image upload UI (wrapper exists — e.g. a profile photo on the
  Profile page — not wired up yet)
- Rate limiting / audit logging wiring (the refund action does not write
  to `AuditLog`, same as every other admin action so far)
- Paystack refund webhook handling for live mode (see Module 7 notes above)

## ✅ Module 5 — Admin Dashboard

Full admin dashboard built across:

### Route group: `src/app/(admin)/admin/`

- **`layout.tsx`** — role gate (`isStaffRole`), sidebar nav for all 8 sections, notifications bell, shared `DashboardChrome` shell. CUSTOMER role is blocked and redirected to `/dashboard`.
- **`page.tsx`** (Overview) — KPI stat cards (active orders, monthly orders, customers, monthly revenue, avg rating) with permission-scoped visibility; recent-orders table; time-of-day greeting.
- **`orders/page.tsx`** — Full order list, filter tabs (All / Active / Pending / Confirmed / Out for delivery / Delivered / Cancelled), rider attribution.
- **`orders/[orderNumber]/page.tsx`** — Admin order detail: items & pricing, logistics (address, zone, rider, special instructions), payment records, append-only status history with actor attribution, customer review preview, progress timeline — plus `AdminOrderActions` panel.
- **`customers/page.tsx`** — Customer list with total-orders/spent summary and account status badge.
- **`customers/[customerId]/page.tsx`** — Customer detail: stat cards, full order history, saved addresses — plus `AdminCustomerActions` panel.
- **`services/page.tsx`** — Services & pricing: per-service enable/disable, inline price editing, toggle price items active/inactive, add new price items, add new services.
- **`staff/page.tsx`** — Staff list with inline role-change select and suspend/reactivate, self-edit protected.
- **`reviews/page.tsx`** — Review moderation queue with filter (all / pending / approved) and approve/hide actions.
- **`reports/page.tsx`** — Revenue KPIs; horizontal CSS bar chart for monthly revenue (last 6 months, server-computed, no chart library dependency); orders-by-service breakdown.
- **`settings/page.tsx`** — Key/value business settings editor (business info, delivery fee, social links) using the existing `Setting` model.

### New server actions: `src/server/actions/admin.ts`

All 12 actions are permission-checked via `hasPermission` before touching the database:

`updateOrderStatusAction`, `assignRiderAction`, `cancelOrderAction`, `suspendCustomerAction`, `createServiceAction`, `toggleServiceAction`, `createPriceItemAction`, `updatePriceItemAction`, `togglePriceItemAction`, `updateStaffRoleAction`, `suspendStaffAction`, `moderateReviewAction`, `upsertSettingAction`.

### New components: `src/components/admin/`

- `admin-order-actions.tsx` — Status update picker + optional note, rider assignment select, cancel-with-reason flow. Disabled when order is terminal.
- `admin-customer-actions.tsx` — Suspend / reactivate customer account.
- `admin-service-manager.tsx` — Full service + pricing CRUD UI.
- `admin-staff-manager.tsx` — Role-change and suspend UI, self-edit guard.
- `admin-review-moderator.tsx` — Approve / hide reviews with filter tabs.
- `admin-settings-editor.tsx` — Grouped settings form, saves all keys in one click.

### Design decisions

- Permission matrix from `rbac.ts` is respected everywhere — stat cards, action panels, and nav items each check the current user's role before rendering.
- Reports page uses a pure CSS bar chart (no recharts / chart.js) to avoid adding a dependency for what amounts to one simple visualization.
- Status history on the order detail page is append-only (matches the `OrderStatusEvent` schema) and shows the actor's name, matching the audit-trail intent of the original schema design.
- The admin layout uses the same `DashboardChrome` + `SidebarNav` as the customer dashboard — no new layout components needed.
- **Verified by**: `eslint` / `prettier` clean; `tsc` has the same ~16 known implicit-`any` errors as before (generated Prisma Client absent in this sandbox); every Prisma query was hand-checked against `schema.prisma` field-by-field.

## ✅ Module 6 — Reports & Analytics

Full reports dashboard replacing the Module 5 placeholder with a live, interactive analytics suite.

### New files

- **`src/server/actions/reports.ts`** — Two server actions:
  - `fetchReportsDataAction(filter)` — accepts `{ from, to }` ISO date strings, returns a typed `ReportsData` object containing summary KPIs, daily revenue series, orders-by-status, orders-by-service, top-10 customers, and rider delivery counts. All queries are permission-gated (`reports.view`).
  - `exportReportsCSVAction(filter)` — generates a CSV of all orders in the date range (order number, date, status, service, customer, amounts, payment method). Permission-gated to `reports.export` (SUPER_ADMIN + MANAGER only). Returns the CSV string + filename; download is handled client-side via a Blob URL — no server-side file storage needed.

- **`src/components/reports/revenue-chart.tsx`** — Recharts `LineChart` with dual y-axes: left axis shows revenue (₦k ticks), right axis shows order count. Dashed line for orders, solid for revenue. Custom tooltip. X-axis label thinning for wide date ranges.

- **`src/components/reports/status-donut-chart.tsx`** — Recharts `PieChart` (donut variant). Each `OrderStatus` gets a distinct colour from a hand-picked map. Custom tooltip. Built-in Recharts `Legend` with formatted status names.

- **`src/components/reports/service-bar-chart.tsx`** — Recharts grouped `BarChart` with dual y-axes (revenue + order count). One bar per service.

- **`src/components/reports/reports-dashboard.tsx`** — Client component. Manages:
  - **Preset range buttons**: Last 7 / 30 / 90 / 365 days. Clicking a preset fires `fetchReportsDataAction` via `useTransition` (no full page reload; UI fades to 50% opacity while loading).
  - **Custom date range**: two `<input type="date">` + Apply button.
  - **Refresh button** with spinner.
  - **Export CSV button** (conditionally rendered based on `canExport` prop passed from the server).
  - 8 KPI stat cards (revenue, orders, AOV, avg rating, delivery rate, cancellation rate, active orders, new/total/repeat customers).
  - Revenue line chart + Orders-by-status donut side by side (lg breakpoint).
  - Service breakdown: chart + a clean table with order counts and revenue.
  - Top-10 customers table (rank, name, email, spend, order count).
  - Rider performance: ranked list with CSS progress bars (no chart library needed here).

- **`src/app/(admin)/admin/reports/page.tsx`** — Server component. Fetches initial 30-day data server-side (no loading state on first paint), passes it to `ReportsDashboard` with `canExport` flag. Permission gate: `reports.view` or redirect to `/admin`.

### Design decisions

- **recharts over CSS bars**: recharts was already in `package.json`. Using it properly for the line and donut charts gives real interactivity (hover tooltips, zoom on resize). The CSS bar from Module 5 was fine for a placeholder; proper charts are appropriate for a dedicated reports module.
- **Server-side initial render**: the page server-component fetches the default 30-day window so there is no client-side loading flash on first visit.
- **`useTransition` for filter changes**: range changes run as non-urgent transitions; React keeps the old data visible (at reduced opacity) while the new data loads, giving a smooth perceived-performance experience.
- **CSV export is client-initiated, Blob-URL download**: avoids generating a file on disk or streaming from a route — simpler, no storage, no route to secure.
- **Contiguous date series**: revenue-by-day fills in zero-revenue days so the line chart never has gaps.
- **`reports.export` is separate from `reports.view`**: RECEPTIONIST can see the reports page but not download raw order data. MANAGER and SUPER_ADMIN can export.

### Verification

- `eslint` clean (0 warnings, 0 errors) on all 5 new files.
- `prettier --check` passes after auto-format.
- `tsc --noEmit` on the new files produces 0 errors in `src/components/reports/` and `src/app/(admin)/admin/reports/page.tsx`. `src/server/actions/reports.ts` has the same implicit-`any` errors as every other Prisma-touching file in this project (missing generated client in the sandbox) — every query was hand-checked against `schema.prisma` field by field; all fields exist, all relations are correct, all types are consistent.
