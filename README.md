# DineFlow — Restaurant Management Demo

DineFlow is a **frontend portfolio demo** of a restaurant management system for the fictional venue **Lumina Kitchen**. It showcases public ordering, kitchen operations, billing, and guest engagement using Next.js, Tailwind CSS, and browser LocalStorage.

> This is not a production restaurant platform. Payments, loyalty, and customer sessions are simulated. There is no real backend, authentication, or payment gateway.

## Key features

- Public site: menu, chefs, reservations, contact, cart & checkout
- Admin: menu, orders, tables, reservations, inventory, recipes, suppliers, staff/shifts, billing, expenses, reports, coupons, loyalty, reviews, engagement
- Staff & kitchen dashboards for service and KDS workflows
- Customer demo session (`cus-1`): orders, tracking, favorites, loyalty, coupons, reviews, notifications
- Simulated invoices, payments, refunds, and financial reports (PKR)

## Tech stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- TypeScript
- lucide-react
- Browser LocalStorage (`dineflow:v5`)

## Dashboards

| Area | Path |
|------|------|
| Public site | `/` |
| Admin | `/admin` |
| Staff | `/staff` |
| Kitchen | `/kitchen` |
| Customer (demo) | `/customer` |

## Project structure

```
app/                  # Routes (public, admin, staff, kitchen, customer)
components/           # UI, layout, domain components, DataProvider
lib/data/             # Store, seed, actions, billing, engagement, ops
lib/storage/          # LocalStorage keys and safe read/write
lib/mock-data/        # Seed content and restaurant info
```

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

Typecheck (optional):

```bash
npx tsc --noEmit
```

## Environment variables

No secrets are required. See `.env.example` for optional placeholders only.

Never commit `.env.local` or real API keys. Do not put private keys in `NEXT_PUBLIC_*` variables.

## Demo data & reset

- Data lives in browser LocalStorage under `dineflow:v5`.
- Older keys (`v2`–`v4`) migrate automatically without wiping records.
- Admin → **Settings → Reset demo data** (confirmation required) reseeds the demo dataset.

## Demo limitations

- Fictional restaurant and guest content
- LocalStorage only (no multi-device sync)
- Demo customer session (not real auth)
- Simulated payments and loyalty
- No POS, SMS, email, or delivery-provider integrations

## Deploy on Vercel

1. Push this repository to GitHub (or import the folder in the Vercel dashboard).
2. Create a new Vercel project from the repo.
3. Framework preset: **Next.js** (auto-detected).
4. Build command: `npm run build` · Output: Next.js default.
5. No required environment variables for the core demo.
6. Deploy. After deploy, optionally set `NEXT_PUBLIC_SITE_URL` to your production URL and update `metadataBase` / sitemap base if you want absolute SEO URLs.

This README does **not** claim a live deployment URL unless you have deployed the project yourself.
