# O Lux Laundry

Premium Laundry Pickup & Delivery Service — full-stack Next.js application.

See `BUILD-STATUS.md` for what's implemented so far and what's coming next —
this project is being built module by module, verifying each one before
moving to the next.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS · Prisma 6 · PostgreSQL ·
NextAuth (Auth.js v4) · React Hook Form + Zod · Framer Motion · Recharts ·
Cloudinary · Paystack · Resend

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up your environment**

   Copy `.env.example` to `.env` and fill in real values:

   ```bash
   cp .env.example .env
   ```

   At minimum for local development you need a `DATABASE_URL` pointing at a
   Postgres database (a free [Neon](https://neon.tech) or
   [Supabase](https://supabase.com) project works fine), and a
   `NEXTAUTH_SECRET` (generate one with `openssl rand -base64 32`).

3. **Create the database schema**

   ```bash
   npx prisma migrate dev --name init
   ```

   This creates the tables described in `prisma/schema.prisma` and generates
   the Prisma Client.

4. **Seed sample data** (a super admin account, services, prices, delivery
   zones, and base settings)

   ```bash
   npm run db:seed
   ```

   This creates an admin login at `admin@oluxlaundry.com` / `ChangeMe123!` —
   change this password immediately in any real deployment.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`.

## Useful scripts

| Command              | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start the dev server                           |
| `npm run build`      | Production build                               |
| `npm run lint`       | Run ESLint                                     |
| `npm run format`     | Run Prettier                                   |
| `npm run db:migrate` | Create/apply a Prisma migration in development |
| `npm run db:studio`  | Open Prisma Studio (visual DB browser)         |
| `npm run db:seed`    | Re-run the seed script                         |

## Project structure

```
prisma/
  schema.prisma        Full data model (users, orders, payments, etc.)
  seed.ts              Seed script for local/demo data
src/
  app/
    (public)/          Marketing site (home, about, pricing, ...)
    (auth)/             Login, register, password reset
    (customer)/         Customer dashboard
    (admin)/            Admin dashboard
    api/                Route handlers (auth, orders, webhooks)
  components/
    ui/                 Reusable shadcn-style primitives
    shared/             Header/footer/providers used across the app
    booking/            Booking-flow specific components
    admin/              Admin-dashboard specific components
  lib/                  auth.ts, prisma.ts, rbac.ts, utils.ts
  server/
    actions/            Server actions (mutations)
    services/            Integration wrappers (Paystack, Cloudinary, Resend)
  types/                Shared TypeScript types
```

## Deploying

This is built to deploy cleanly to Vercel with a managed Postgres database
(Neon, Supabase, or Vercel Postgres all work). Set the same environment
variables from `.env.example` in your Vercel project settings, then run
`npx prisma migrate deploy` against the production database as part of your
deploy step (or via a release command).

## Module 8 — Notifications & Communication

Full multi-channel notification system covering in-app, email, SMS, and WhatsApp.

### New services: `src/server/services/`

- **`notifications.ts`** — Central dispatcher (`dispatchNotification`). Reads per-user channel preferences from the `Setting` table and fans out to each enabled channel independently. Every channel fails softly — a failed SMS never aborts a payment flow. Preferences default to in-app + email + SMS on; WhatsApp is opt-in.

- **`sms.ts`** — Mock SMS service using the Termii API interface. Without `TERMII_API_KEY`, logs to console. Includes pre-built `smsTemplates` for every key event. Swap the `fetch` call for any provider (Twilio, AfricasTalking) without touching callers.

- **`whatsapp.ts`** — Mock WhatsApp service using the Meta Cloud API. Without `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`, logs to console. Includes rich `whatsAppTemplates` with emoji formatting.

### New email templates: `src/emails/`

- `booking-confirmed-email.tsx` — Sent to customer on booking creation with full order summary table.
- `order-status-email.tsx` — Sent on key status transitions (confirmed, picked up, out for delivery, delivered). Includes a coloured status banner and optional staff note.
- `payment-confirmed-email.tsx` — Sent after payment verified; green summary box.
- `refund-processed-email.tsx` — Sent after refund issued; amber summary box.
- `admin-new-booking-email.tsx` — Sent to all SUPER_ADMIN users when a new booking is placed.

### New components: `src/components/notifications/`

- **`notification-prefs-form.tsx`** — Toggle switches for in-app / email / SMS / WhatsApp channels. Saves to the `Setting` table under a per-user key. Used in the customer profile page.

### Updated components

- **`notifications-bell.tsx`** — Enhanced: shows unread count badge (with overflow "9+"), timestamps, type icons, unread dot per item, and a "See full history" link to the notification center.

### New pages

- **`/dashboard/notifications`** — Full notification history with filter tabs (All / Unread), mark-as-read/unread per item, delete individual notifications, clear all, unread count in heading. Uses `useTransition` for optimistic updates.
- **`/admin/notifications`** — Same notification center for admin staff, reusing the same component.

### Updated actions

- **`booking.ts`** — On booking creation: in-app notification (in tx), customer email, customer SMS (if phone on file), admin in-app + email to all SUPER_ADMINs.
- **`payment.ts`** — On payment confirmation: in-app (in tx), customer email, customer SMS. On refund: in-app (in tx), customer email, customer SMS.
- **`admin.ts`** — `updateOrderStatusAction` now fires `sendOrderStatusNotification` after the DB update, which sends in-app + email + SMS (where configured) for: CONFIRMED, PICKED_UP, RECEIVED, WASHING, QUALITY_CHECK, OUT_FOR_DELIVERY, DELIVERED. `cancelOrderAction` sends an in-app notification to the customer with the cancellation reason.
- **`notifications.ts`** — Extended with: `markNotificationReadAction`, `markNotificationUnreadAction`, `fetchNotificationsAction` (paginated), `deleteNotificationAction`, `clearAllNotificationsAction`, `fetchNotificationPrefsAction`, `saveNotificationPrefsAction`.

### Updated layouts

- Customer layout and admin layout both add a **Notifications** nav item to the sidebar.

### Env vars added (`.env.example`)

```
TERMII_API_KEY        SMS gateway key (Termii)
SMS_SENDER_ID         SMS sender ID (default: OLuxLaundry)
WHATSAPP_TOKEN        Meta System User Access Token
WHATSAPP_PHONE_NUMBER_ID  Meta Business phone number ID
```

All four are optional — without them the system logs to console and continues normally.

### Design decisions

- **No new dependencies**: SMS and WhatsApp use native `fetch`; email reuses the existing Resend/react-email stack already in `package.json`.
- **Per-user preferences in `Setting` table**: avoids a new DB table/migration; the generic key-value store already designed for exactly this kind of extensible config.
- **Fire-and-forget for external channels**: email/SMS/WhatsApp sends happen outside transaction boundaries so a transient provider failure cannot roll back a booking or payment.
- **`dispatchNotification` is transaction-aware**: callers can pass a Prisma transaction client for the in-app notification so it's atomic with the business operation, while external channels are always fire-and-forget.
- **Admin in-app notifications**: admins receive in-app notifications for new bookings, allowing them to see the bell indicator light up without needing to poll the orders page.
