# CLAUDE.md

## Read this first, every session

**[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) is the source of truth
for this project.** Read it before starting any task here — it holds the
architecture, the data model, the confirmed decisions, the phase order and the
non-negotiables.

Whenever you are unsure about scope, behaviour, a field name, a flow or a
technology choice, check that file first. `README.md` documents the existing
design system, brand assets and RTL setup — read it before touching UI.

## Rules of engagement

1. **Do not make product or architecture decisions yourself.** If the answer is
   not in `docs/IMPLEMENTATION_PLAN.md`, **ask the user**. Guessing is worse than
   pausing — several requirements here are deliberately non-obvious (pricing
   modes, coupon rejection rules, discount stacking, review moderation).
2. **Write decisions back.** When the user answers something, add it to the plan
   (the decisions table or the relevant section), remove it from the open-questions
   table, and note it in the changelog.
3. **The plan is authoritative over the PDF.** `public/Nexislabs Deal on Herbal
   Ecommerce.pdf` is the signed scope, but the client's custom requirements
   override it wherever they conflict — section 2 of the plan lists them.
4. **Never add Harvest Calendar content.** It appears in the PDF and is explicitly
   out of scope. No route, nav item, CMS section, seed record or copy string.
5. Follow the phase order in section 9 (15 phases, 0–14). Finish a phase to a
   working, verifiable state before starting the next.
6. **Section 12 is the out-of-scope list.** Do not build anything on it, and do
   not re-open those decisions mid-build.

## Project shape

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · MongoDB +
Mongoose · Stripe Checkout · Resend · S3-compatible storage · in-process
`node-cron` (so the deploy target is a **persistent Node server / VPS**, not
Vercel serverless).

Bilingual EN/AR storefront under `/[locale]`; English-only admin portal under
`/admin`. The design system in `src/app/globals.css` and `src/components/` is an
asset — reuse it, do not rebuild it.

## Hard rules (full list in plan section 11)

- Money is stored as integer fils (AED × 100). Never floats.
- Never trust client-supplied prices — recompute server-side via
  `src/lib/pricing.ts`, which is the only place pricing logic lives.
- The Stripe webhook marks orders paid, never the browser redirect.
- Order line items are snapshots; editing a product must not alter placed orders.
- Every admin mutation is permission-checked server-side, not just hidden in the UI.
- Bilingual content: EN required, AR optional with EN fallback. Use logical CSS
  properties so RTL keeps working.

## Commands

```bash
npm run dev              # http://localhost:3000 -> redirects to /en
./scripts/serve.sh 3111  # clean production rebuild + one server
```

Use `scripts/serve.sh` rather than `next build && next start` by hand — see
`README.md` for why (stale servers serve hashed assets that no longer exist and
every page renders unstyled).
