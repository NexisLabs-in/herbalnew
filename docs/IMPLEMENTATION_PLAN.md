# Herbedia — Implementation Plan

**Status:** all 15 phases built (2026-09-05). Live-credential verification and a
real card payment through the hosted checkout remain — see `docs/DEPLOYMENT.md`.
**Source of truth for:** architecture, data model, feature behaviour, phase order.

This document is the single reference for turning the current demo storefront into a
working single-vendor e-commerce platform. It combines:

1. `public/Nexislabs Deal on Herbal Ecommerce.pdf` — the signed scope document.
2. The client's custom requirements (section 2), which **override** the PDF
   wherever they conflict.
3. Every decision confirmed with the client in the planning session (section 3).

> **Rule for whoever is implementing (human or Claude):** read this file before
> starting any task. If something needed is not decided here, **ask** — do not
> invent the answer. Anything newly decided gets written back into this file and
> into the changelog.

---

## 1. Where the project stands today

The repo is a **static marketing storefront**, not an application:

- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4.
- Every page is statically prerendered in two locales (`/en`, `/ar`) via
  `src/middleware.ts`.
- All content is hardcoded in `src/content/*.ts` — `products.ts`, `brand.ts`,
  `pages.ts`, `legal.ts`. Each string is a `{ en, ar }` pair (`type L`).
- **There is no database, no auth, no cart, no checkout, no admin.**
- The buy panel is a `mailto:` link; prices are `null` ("awaiting confirmation").
- The contact page is also `mailto:` only — no form anywhere in the codebase.
- Design system lives in `src/app/globals.css` (`@theme` tokens + component layer)
  and `src/components/*`. Documented in `README.md`.

**The design system is an asset, not something to rebuild.** Everything below
reuses the existing components, tokens, RTL handling and bilingual `t()` helper.
The work is adding an application behind them.

---

## 2. Client's custom requirements

These were given directly by the client and take priority over the PDF:

| # | Requirement |
|---|---|
| C1 | Products support **two pricing modes**: *fixed price* or *request price*. Admin chooses per product; the product view reflects it. |
| C2 | **Review moderation is a toggle.** Off → customer reviews publish immediately. On → admin approval required before a review appears publicly. |
| C3 | **Logistics = a simple status dropdown**: packed, dispatched, out for delivery, delivered, cancelled, returned. No courier API integration. |
| C4 | **Payment gateway is Stripe.** |
| C5 | **Customer login is email + OTP only.** No password. Name, address and other details are collected later — at first order, or manually from account settings. |
| C6 | **Sales:** admin can start a sale — pick products, set a discount percentage per product, set start and end dates. |
| C7 | **Permanent discount** field on product add/edit. If empty, no discount is shown anywhere. |
| C8 | **Coupon codes** created by admin: percentage or fixed amount, expiry, applied to a hand-picked set of products (with a select-all). |
| C9 | **No Harvest Calendar anywhere on the website.** It appears in the PDF but is explicitly out of scope. |
| C10 | **Featured products section on the homepage**, with products added/removed from the admin portal. |
| C11 | **Shipping charge is editable by admin** and is the same for all products. |
| C12 | **Low stock is surfaced three ways:** a notification in the admin panel, an email to the admin, and a public "only X left" warning on the product page visible to normal customers. |

### C8 — exact coupon semantics (confirmed)

A coupon carries a hand-picked product list (with a "select all" shortcut). At
checkout the coupon **discounts the whole cart total**, but validation is
all-or-nothing:

> If the cart contains **any** product that is not in the coupon's selected list,
> the coupon is **rejected** with a clear message naming the offending product.
> It is never partially applied.

### C9 — enforcement

No route, nav item, CMS section type, seed record or copy string may reference a
harvest calendar. Currently clean (`grep -i harvest src/` returns nothing) —
keep it that way.

### C12 — exact low-stock semantics (confirmed)

**One global threshold** lives in Settings (`inventory.lowStockThreshold`,
default 5). That single number drives all three surfaces:

- **Admin panel** — a low-stock badge/count in the nav and a low-stock list on
  the dashboard, driven by a live query. Always current, no state to maintain.
- **Admin email** — sent **immediately** when an order drops a product's stock
  to or below the threshold, and **again in a once-daily digest** listing
  everything low or out of stock. The instant email is not re-sent for the same
  product until stock is restocked above the threshold
  (`product.lowStockAlertedAt` is cleared on restock), so a busy product cannot
  spam the mailbox.
- **Public product page** — when `0 < stock <= threshold`, the buy box shows
  "Only X left" in both languages. At `stock === 0` it shows out-of-stock
  instead (see 8.7).

---

## 3. Confirmed decisions

Every question raised during planning, answered. Do not revisit these without asking.

### Platform

| Area | Decision |
|---|---|
| Database | **MongoDB + Mongoose** |
| App structure | **One Next.js app** — storefront + `/admin` + API in this repo |
| Hosting | **VPS / Docker — a persistent Node server** (not Vercel serverless). Settled by the in-process cron choice below |
| Scheduled jobs | **In-process `node-cron`**, started once from the server runtime |
| Email | **Resend or SMTP (nodemailer)** — pick with `MAIL_DRIVER`. OTP, order confirmations, status updates, low-stock alerts, back-in-stock, abandoned cart, admin alerts |
| File storage | **S3-compatible bucket** (Cloudflare R2 / AWS S3 / Backblaze) via presigned uploads — kept over local disk so images survive a server rebuild |
| Payments | **Stripe Checkout (hosted page)** — redirect out, return to a confirmation page; the webhook is the source of truth |
| Credentials | **Client provides Stripe, Resend domain and the bucket later.** Build against Stripe test mode, a console mail driver and a local storage stub; swap via env before launch |
| Testing | **Vitest unit tests on the pricing engine only.** Everything else manually verified |
| Currency / admin language | **AED only. Admin panel UI is English only** (it still edits EN + AR content fields) |

### Customers & auth

| Area | Decision |
|---|---|
| Customer auth | **Email + OTP, no password.** Login required to check out — no guest checkout |
| Admin auth | Email + password, separate session cookie from customers |
| Admin password reset | **Email OTP** — same 6-digit mechanism as customer login, then set a new password |
| Admin roles | **Full role editor** — custom roles with per-module permission checkboxes |

### Catalogue

| Area | Decision |
|---|---|
| Product variants | **None.** One price, one SKU per product. Different sizes are separate products |
| Bilingual products | Every text field has EN + AR inputs. **EN required, AR optional** — blank AR falls back to EN on `/ar` |
| Categories | **Two levels**, from the client's own taxonomy (`docs/Products categories.docx`): four top-level groupings with seven subcategories. **Products sit on a subcategory only**; a parent means "everything beneath it". Still a filter on `/shop` — no `/categories/[slug]` landing pages |
| Shop on mobile | **Filters collapsed by default**; the "Read before ordering" advisory is **desktop-only on `/shop`** so the first products sit in the first viewport. Desktop keeps filters open and the advisory visible |
| Related products | **Automatic — other published, in-stock products from the same category.** No manual picking |
| Out of stock | **Product stays visible and listed**, buy button disabled and labelled, plus a **"Notify me when back in stock"** email capture that fires when admin restocks |
| Seed data | **Only the two real formulas** (`hair-growth`, `prostate-health`). Demo filler products and the three demo shelves are dropped |

### Money & orders

| Area | Decision |
|---|---|
| Tax | **Added at checkout** as a separate line, from an admin-configurable rate % |
| Shipping | **Flat rate + optional free-shipping threshold** ("free above AED X"; blank = always charge) |
| Discount stacking | **Best single product-level discount** (sale % vs permanent discount — the larger wins, never both), **then** the coupon applies on top of the resulting cart total |
| Request-price flow | Enquiry → **admin sets a quoted price** → customer gets a link and pays (C1) |
| Manual orders | **Not supported.** Every order originates from the storefront or an accepted quote, so orders reconcile 1:1 with Stripe |
| Refunds | **Handled manually in the Stripe dashboard.** The app only marks the order cancelled/returned and records who did it |
| Customer cancellation | **Request only** — customer can request cancellation while the order is `new` or `packed`; admin approves or declines and refunds in Stripe |
| Invoices | **Printable HTML invoice page** for customer and admin, linked from the confirmation email. Chosen over a PDF library because none of them shape Arabic correctly — letters render disconnected — and headless Chrome would put ~300MB of Chromium on the VPS for one document |
| Shipping destinations | **UAE only.** Country locked; address = full name, phone, line 1, line 2 (optional), area/city, **Emirate dropdown (7)**. No postcode field |

### Content & comms

| Area | Decision |
|---|---|
| CMS | **Full CMS** — every homepage section and content page is admin-editable, via a fixed section registry |
| Reviews | **Verified buyers only** — must have a delivered order containing that product; one review per purchase |
| Contact page | **Real form + admin inbox** (read/unread/archived) with an email notification to admin |
| Reports | **Dashboard charts + CSV export**, with a date-range picker: sales over time, top products, order counts, new customers, inventory status |
| Extra comms | **Abandoned-cart email** to logged-in customers, sent by the cron. **No newsletter signup. No WhatsApp notifications.** |

---

## 4. Architecture

### 4.1 Stack additions

```
mongoose                    MongoDB ODM
zod                         input validation, shared client/server
jose                        signed JWT session cookies
stripe                      server SDK
resend                      transactional email (MAIL_DRIVER=resend)
nodemailer                  SMTP transactional email (MAIL_DRIVER=nodemailer)
@react-email/components     email templates
@aws-sdk/client-s3          presigned uploads (works with R2/Backblaze)
@aws-sdk/s3-request-presigner
bcryptjs                    admin password + OTP code hashing
node-cron                   daily digest, abandoned cart
recharts                    admin report charts
vitest                      pricing engine unit tests
```

### 4.2 Directory layout (target)

```
src/
  app/
    [locale]/                 storefront (existing pages + cart/checkout/account)
    admin/                    admin portal — NOT locale-prefixed, English only
    api/
      webhooks/stripe/        Stripe webhook (raw body, signature verified)
      uploads/presign/        S3 presigned PUT
      invoices/[orderNumber]/ printable invoice
  components/                 existing design system (unchanged)
    storefront/               buy box, cart, review form, address form…
    admin/                    table, form fields, bilingual input, image picker…
  content/                    KEPT as the seed source; runtime reads the DB
  lib/
    db.ts                     cached Mongoose connection (hot-reload safe)
    models/                   one file per Mongoose model
    auth/                     customer OTP, admin password, sessions, guards
    pricing.ts                the single pricing engine (see 6)
    jobs/                     cron registration + job functions
    stripe.ts  mail.ts  storage.ts  pdf.ts
    i18n.ts                   existing helpers + AR→EN fallback + fils formatting
  server/actions/             server actions, grouped by module
  middleware.ts               locale routing + route protection
  instrumentation.ts          starts node-cron once, server-side only
docs/IMPLEMENTATION_PLAN.md   this file
scripts/seed.ts               roles, settings, categories, 2 products, owner admin
```

### 4.3 Conventions

- **Server actions** for mutations from forms; **route handlers** only for
  webhooks, uploads, file streaming and anything external.
- **Zod schema per action**, validated server-side. Never trust the client.
- **Never trust client-sent prices.** The pricing engine recomputes every total
  server-side before creating a Stripe session.
- Mongoose models are singletons guarded against Next.js hot-reload re-registration.
- All money is stored as **integer fils** (AED × 100). `formatAed()` in
  `src/lib/i18n.ts` is extended to take fils.
- Bilingual fields are `{ en: string, ar?: string }`; a `tl()` helper reads AR
  with EN fallback.
- Cron jobs are registered from `instrumentation.ts`, guarded so they start once
  and only on the server runtime.

---

## 5. Data model

All collections carry `createdAt` / `updatedAt`. Public-facing identifiers are
slugs or generated numbers, never raw ObjectIds.

### Catalogue

**`Category`** (indication categories / shelves)
`slug`, `name{en,ar}`, `note{en,ar}`, `description{en,ar}`, `parentId | null`,
`image`, `order`, `published`.
Two levels, enforced: a subcategory cannot itself become a parent. Products are
assigned to subcategories only, so a parent selection expands to its children.
No SEO fields and no landing page — categories exist as a `/shop` filter.

The taxonomy is transcribed in `src/content/taxonomy.ts` and seeded from there:

| Top level | Subcategories |
|---|---|
| Beauty & Personal Care | Hair Care & Growth · Skin Cleansing & Glow |
| Wellness & Lifestyle | Detox & Cleansing · Weight Management |
| Body Systems & Chronic Support | Digestive Health · Heart & Blood Pressure |
| Reproductive & Hormonal Health | Fertility & Vitality |

`prostate-health` sits in Fertility & Vitality at the client's direction — the
supplied taxonomy has no shelf for prostate support specifically. Worth
revisiting with them if a men's-health range grows.

**`Product`**
- Identity: `slug`, `sku`, `name{en,ar}`, `summary{en,ar}`, `categoryId`, `form`
  (`oil` | `powder`), `formLabel{en,ar}`.
- Pricing: `pricingMode: "fixed" | "request"`, `priceFils` (required when fixed,
  null when request), `permanentDiscount: { type: "percent"|"amount", value } | null`.
- Inventory: `trackInventory`, `stock`, `lowStockAlertedAt | null`.
  **No per-product threshold** — one global number in Settings (C12).
  `minOrderQty` (default 1) and `maxOrderQty` (null = no product cap). The
  basket, checkout and quote payment refuse a quantity outside that range.
  Stock and the line limit of 99 still apply. Empty maximum on the form means
  no product-specific maximum.
- Herbal content (carried over from `src/content/products.ts`):
  `composition{en,ar}`, `chemistryEffects{en,ar}`, `directions{ steps[{detail{en,ar},
  measure}], frequency{en,ar}, maximum{en,ar} } | null`, `netQuantity{en,ar}`,
  `batch{en,ar}`, `shelfLifeMonths`, `storage{en,ar}`,
  `safety{ targetGroup{en,ar}, cautions[{en,ar}], seekAdvice[{en,ar}] }`.
- Media: `images[{ key, url, alt{en,ar}, isPrimary, kind: "photo"|"pack"|"carton"|"plate" }]`.
- Merchandising: `featured`, `featuredOrder`. **No `relatedProductIds`** — the
  recommended list under reviews is every other published product on the same
  category, highest `ratingAvg` first, loaded in pages as the visitor scrolls.
- Publishing: `status: "draft"|"published"|"archived"`, `seo{title{en,ar},description{en,ar}}`.
- Denormalised: `ratingAvg`, `reviewCount`.

Indexes: `slug` unique, `sku` unique, text index over EN+AR name/summary for
search, compound `{status, categoryId}`, `{featured, featuredOrder}`, `{stock}`.

### People & auth

**`Customer`** — `email` (unique, lowercased), `name?`, `phone?`,
`addresses[{ _id, label, fullName, phone, line1, line2?, city, emirate,
country: "AE", isDefault }]`, `defaultAddressId`, `status: "active"|"blocked"`,
`emailVerifiedAt`, `lastLoginAt`, `wishlist[productId]`.

**`OtpToken`** — `email`, `purpose: "customer_login" | "admin_reset"`, `codeHash`,
`expiresAt` (TTL index), `attempts`, `consumedAt`, `ip`.
6-digit code, 10-minute expiry, max 5 attempts, rate-limited per email and per IP.

**`AdminUser`** — `email` (unique), `name`, `passwordHash`, `roleId`, `active`,
`lastLoginAt`, `mustChangePassword`.

**`AdminRole`** — `name`, `description`, `permissions: string[]`, `isSystem`.
Permissions are `module:action` strings: `products`, `categories`, `inventory`,
`orders`, `enquiries`, `customers`, `reviews`, `coupons`, `sales`, `content`,
`messages`, `reports`, `settings`, `admins` × `read` / `write`
(plus `reviews:moderate`, `admins:manage`). A seeded, non-deletable **Owner**
role holds `*`.

Sessions are stateless signed JWTs in httpOnly cookies: `hb_customer` and
`hb_admin`, different secrets, `sameSite=lax`, `secure` in production.

### Commerce

**`Cart`** — `cartId` (cookie, for anonymous browsing), `customerId?`,
`items[{ productId, qty }]`, `couponCode?`, `abandonedEmailSentAt?`,
`expiresAt` (TTL 30 days). On login the anonymous cart merges into the
customer's cart.

**`Order`**
- `orderNumber` (`HB-2026-0001`), `customerId`, `email`.
- `items[{ productId, slug, name{en,ar}, sku, image, unitPriceFils, discountFils,
  qty, lineTotalFils, discountSource: "none"|"permanent"|"sale"|"quote" }]`
  — a **snapshot**; later product edits never change a placed order.
- Totals: `subtotalFils`, `productDiscountFils`, `couponCode?`,
  `couponDiscountFils`, `shippingFils`, `taxRate`, `taxFils`, `grandTotalFils`,
  `currency: "AED"`.
- `shippingAddress` (embedded copy).
- Payment: `paymentStatus: "pending"|"paid"|"failed"|"refunded"`,
  `stripe{ checkoutSessionId, paymentIntentId, chargeId }`, `paidAt`,
  `refundNote?` (free text — refunds happen in the Stripe dashboard).
- Fulfilment: `fulfillmentStatus: "new"|"packed"|"dispatched"|"out_for_delivery"|
  "delivered"|"cancelled"|"returned"` (C3),
  `statusHistory[{ status, at, byAdminId, note }]`,
  `tracking{ courier, number, note }`.
- Cancellation (customer-requested): `cancellationRequest{ status:
  "none"|"requested"|"approved"|"declined", requestedAt, reason, handledBy,
  handledAt, adminNote }`.
- `invoiceNumber`, `enquiryId?` (set when the order came from a quote).

**`Coupon`** — `code` (uppercase, unique), `discountType: "percent"|"amount"`,
`value`, `allProducts: boolean`, `productIds[]`, `expiresAt`, `minOrderFils?`,
`usageLimit?`, `usageLimitPerCustomer?`, `usedCount`, `active`.

**`Sale`** — `name`, `startAt`, `endAt`, `active`,
`entries[{ productId, discountPercent }]`. Overlapping sales resolve to the
largest percentage for a given product.

**`PriceEnquiry`** (request-price, C1) — `productId`, `qty`, `customerId?`,
`name`, `email`, `phone?`, `message?`,
`status: "new"|"quoted"|"accepted"|"expired"|"closed"`, `quotedUnitPriceFils?`,
`quoteExpiresAt?`, `quoteToken` (single-use, unguessable), `adminNote?`, `orderId?`.

**`Review`** — `productId`, `customerId`, `orderId`, `rating` 1–5, `title?`,
`body`, `status: "pending"|"approved"|"rejected"`, `adminNote?`, `publishedAt?`.
Unique index on `{productId, customerId, orderId}` — one review per purchase.

**`StockNotification`** (back-in-stock) — `productId`, `email`, `customerId?`,
`notifiedAt | null`. Unique on `{productId, email, notifiedAt: null}`.

### Configuration & content

**`Settings`** (singleton document)
- `store{ name, contactEmail, contactPhone, address{en,ar}, socials }`
- `shipping{ flatRateFils, freeAboveFils | null }` (C11)
- `tax{ enabled, ratePercent, label{en,ar} }`
- `inventory{ lowStockThreshold }` — one number, drives admin alerts **and** the
  public "only X left" warning (C12)
- `reviews{ moderationEnabled }` (C2)
- `invoice{ prefix, nextNumber, legalLines{en,ar} }`
- `notifications{ adminAlertEmails[], digestHourLocal }`
- `cart{ abandonedAfterHours }`
- `seo{ defaultTitle{en,ar}, defaultDescription{en,ar}, ogImage }`

**`ContentPage`** — `slug` (`home`, `method`, `faq`, `contact`, `legal`),
`title{en,ar}`,
`seo{title{en,ar}, description{en,ar}}`, `published`,
`sections[{ type, order, visible, data }]`.

`legal` is one storefront page (`/legal`) and one admin page. Its sections are
the policy accordion (terms, privacy, cookies, shipping). Heading and intro are
the page title and SEO description. The old split records (`legal-notice`,
`privacy`, `terms`, `returns`) are retired.

Section `type` comes from a **fixed registry** mapped 1:1 onto existing
components, so the CMS edits copy and ordering, never layout:
`hero`, `trustStrip`, `traditionsRibbon`, `featuredProducts`, `categoryGrid`,
`methodTeaser`, `richText`, `accordion` (FAQ), `imageText`, `advisory`, `ctaBanner`.
The `featuredProducts` section reads `Product.featured` — it holds no product list
of its own (C10). **No harvest-calendar section type exists** (C9).

**`ContactMessage`** — `name`, `email`, `phone?`, `subject?`, `message`,
`status: "new"|"read"|"archived"`, `handledBy?`, `createdAt`.

**`AuditLog`** — `adminId`, `action`, `entity`, `entityId`, `diff`, `at`.
Written on every admin mutation.

---

## 6. The pricing engine (`src/lib/pricing.ts`)

One module. Every surface — product card, PDP, cart, checkout, Stripe session,
order snapshot, invoice — calls it. Nothing recomputes prices independently.
**This is the only module with unit tests** (Vitest); it is the one place a bug
costs real money.

**Per line item**
1. Start at `product.priceFils`. A `request`-mode product has no price and cannot
   enter the cart at all (except via an accepted quote, which supplies its own price).
2. Resolve the product-level discount:
   - `saleDiscount` = largest `discountPercent` from any sale where
     `active && startAt <= now <= endAt` and the product is listed.
   - `permanentDiscount` = the product's own field, normalised to an amount.
   - **The larger of the two wins. They never stack.**
   - If neither exists, no discount UI renders anywhere (C7).
3. `lineTotal = (price − discount) × qty`.

**Per cart**
4. `subtotal` = Σ line totals before discount; `productDiscountTotal` = Σ discounts.
5. Coupon (C8): reject unless — code exists, `active`, not expired, usage limits
   not exceeded, `minOrderFils` met, **and every product in the cart is covered by
   the coupon** (`allProducts` or present in `productIds`). Rejection returns a
   specific reason naming the offending product. Applied to the post-product-discount
   cart total.
6. Shipping (C11): `flatRateFils`, or 0 when `freeAboveFils` is set and the
   post-discount total meets it.
7. Tax: `ratePercent` applied to (post-discount total + shipping) when enabled.
8. `grandTotal = discountedSubtotal − couponDiscount + shipping + tax`.

Rounding happens once, at the end of each step, in integer fils.

---

## 7. Route map

### Storefront (`/[locale]/…`, EN + AR)

| Route | Notes |
|---|---|
| `/` | Home, from the `home` ContentPage + featured products (C10) |
| `/shop` | Catalogue: search, category filter, sort, pagination |
| `/shop/[slug]` | PDP: fixed price → add to cart; request price → enquiry form (C1); stock state (C12); reviews; recommended products (same category, rating desc, infinite scroll) |
| `/cart` | Line items, qty, coupon field, totals |
| `/checkout` | Login-gated. Address form/picker → shipping + tax → Stripe redirect |
| `/order/confirmation` | Post-Stripe return; polls until the webhook confirms |
| `/login` | Email → OTP (C5) |
| `/account` | Dashboard |
| `/account/profile` `/addresses` `/orders` `/orders/[orderNumber]` `/wishlist` | Customer portal. Orders and wishlist are paged (10 per page) — never the full list |
| `/quote/[token]` | Accept an admin quote and pay (C1) |
| `/method` `/faq` `/contact` `/legal` | CMS-driven; `/legal` is one page; `/contact` carries the real form |

No `/categories/[slug]` — categories are a `/shop` filter.

### Admin (`/admin/…`, English only)

`login` · `forgot-password` · `dashboard` · `products` (+`/new`, `/[id]`) ·
`categories` · `inventory` · `orders` (+`/[id]`) · `enquiries` (+`/[id]`) ·
`customers` (+`/[id]`) · `reviews` · `coupons` · `sales` · `featured` ·
`messages` (contact inbox) · `content` (`/home`, `/pages/[slug]`, `/faq`, `/legal`) ·
`reports` · `settings` (`/general`, `/shipping`, `/tax`, `/inventory`,
`/notifications`, `/payments`) · `admins` (`/users`, `/roles`).

### API route handlers

`POST /api/webhooks/stripe` · `POST /api/uploads/presign` ·
`GET /[locale]/invoice/[orderNumber]` · `GET /api/reports/export` (CSV) ·
`GET /api/health`.

### Scheduled jobs (`node-cron`, in-process)

| Job | Schedule | Does |
|---|---|---|
| `lowStockDigest` | daily at `notifications.digestHourLocal` | Emails admin a list of low/out-of-stock products (C12) |
| `abandonedCart` | hourly | Emails logged-in customers whose cart is older than `cart.abandonedAfterHours` and unpurchased; once per cart |
| `expireQuotes` | hourly | Marks `PriceEnquiry` past `quoteExpiresAt` as `expired` |
| `expireSales` | hourly | Deactivates sales past `endAt` and revalidates affected pages |

---

## 8. Key flows

### 8.1 Customer login (C5)
Email → server creates a hashed 6-digit OTP, mails it via Resend, rate-limited by
email + IP → customer enters the code → on success a `Customer` is created if
absent (email only, nothing else), session cookie issued, anonymous cart merged.
Name and address stay empty until first checkout or a manual edit in settings.

### 8.2 Checkout → Stripe (C4)
Cart → login gate → address (pick saved / add new, saved to the profile;
UAE-only fields with an Emirate dropdown) → server recomputes every total via the
pricing engine → creates an `Order` with `paymentStatus: "pending"` and a Stripe
Checkout Session (line items built server-side, `client_reference_id` = order id)
→ redirect to Stripe → customer returns to the confirmation page.

**The webhook is the source of truth.** `checkout.session.completed` marks the
order paid, decrements stock, fires the low-stock check (8.6), increments coupon
usage, generates the invoice number, and sends the confirmation email plus
the admin alert. The return page never marks an order paid on its own. Handlers
are idempotent, keyed on the Stripe event id.

### 8.3 Request price (C1)
A `request`-mode PDP shows an enquiry form instead of a price and an add-to-cart
button → creates a `PriceEnquiry` (`new`) and alerts admin → admin opens it,
enters a unit price and an expiry, sends the quote → customer receives a link to
`/quote/[token]` showing the quoted price → accepting creates a single-item order
at the quoted price and goes through the same Stripe flow. Expired or already-used
tokens show a clear message. The `expireQuotes` job ages them out.

### 8.4 Order fulfilment (C3)
The admin order page carries a status dropdown (`packed`, `dispatched`,
`out for delivery`, `delivered`, `cancelled`, `returned`) plus optional
**courier name, tracking number and note**. Every change appends to
`statusHistory` with a timestamp and the acting admin, and triggers a customer
email. The customer's order page renders the same history as a timeline.

**Refunds are not issued from this app.** Admin refunds in the Stripe dashboard,
then marks the order `cancelled` / `returned` here and may record a `refundNote`.

### 8.5 Cancellation requests
While an order is `new` or `packed`, the customer sees a "Request cancellation"
button on the order page; submitting sets `cancellationRequest.status =
"requested"` with a reason and alerts admin. Admin approves (then refunds in
Stripe and sets the order `cancelled`) or declines with a note. Either way the
customer is emailed. No money moves automatically.

### 8.6 Low stock (C12)
On every stock decrement (webhook) and every manual inventory adjustment:

```
if (trackInventory && stock <= settings.inventory.lowStockThreshold
    && !product.lowStockAlertedAt) → email admin now, set lowStockAlertedAt
if (stock > threshold) → clear lowStockAlertedAt   // re-arms the alert
```

The admin panel derives its badge and dashboard list from a live query, not from
that flag. The `lowStockDigest` cron emails the daily summary. The storefront
shows "Only X left" for `0 < stock <= threshold`.

### 8.7 Out of stock and back-in-stock
At `stock === 0` the product stays listed and its page stays live, with the buy
button disabled and labelled *Out of stock*, plus a "Notify me when back in
stock" email field creating a `StockNotification`. When admin raises stock above
zero, everyone waiting is emailed once and their record is stamped `notifiedAt`.

### 8.8 Reviews (C2)
Only a logged-in customer with a **delivered** order containing that product can
review it, once per purchase. If `settings.reviews.moderationEnabled` is **off**,
the review is `approved` on submit and appears immediately. If **on**, it is
`pending` and invisible publicly until an admin approves it. Flipping the toggle
does not retroactively change existing reviews. Admin can approve, reject and
delete, and sees a pending count badge. `ratingAvg` / `reviewCount` are
recomputed on every status change.

### 8.9 Contact
The contact page form (name, email, phone, subject, message, honeypot +
rate limit) creates a `ContactMessage` and emails
`notifications.adminAlertEmails`. Admin works the inbox with read/archive states.

---

## 9. Phases

Each phase ends in a working, committed, manually verifiable state.

| # | Phase | Delivers |
|---|---|---|
| 0 | **Foundations** | Deps, `.env.example`, Mongo connection helper, fils money utils, `tl()` AR-fallback helper, Zod setup, mail/storage/stripe stub drivers, seed script skeleton |
| 1 | **Data layer** | All Mongoose models + indexes; seed Owner role and admin, settings, categories, the two real formulas; demo products removed from `src/content` |
| 2 | **Auth** | Customer OTP login + session; admin password login + OTP password reset; role/permission guards; middleware protection for `/admin` and `/account` |
| 3 | **Admin shell + catalogue** | Admin layout, permission-gated nav, dashboard stub; product CRUD with bilingual fields, both pricing modes (C1), permanent discount (C7), S3 image upload; category CRUD; inventory screen with adjustments and low-stock list |
| 4 | **Storefront on the DB** | Shop and PDP read Mongo; search, filters, sort, pagination; price and discount display; request-price state; stock states incl. "Only X left" and notify-me (C12); related products; ISR + on-write revalidation |
| 5 | **Cart & pricing engine** | Cart persistence and merge-on-login, cart page, coupon entry, pricing engine + Vitest suite |
| 6 | **Checkout, Stripe, orders** | Address book (UAE fields), checkout, Stripe Checkout, webhook, order records, admin order management with the status dropdown and tracking (C3), cancellation requests, emails, printable invoices |
| 7 | **Customer portal** | Dashboard, profile, addresses, order history, tracking timeline, wishlist |
| 8 | **Reviews** | Verified-buyer submission, moderation toggle + queue (C2), PDP rating display |
| 9 | **Price enquiries** | Enquiry capture, admin quoting, `/quote/[token]` acceptance and payment (C1) |
| 10 | **Marketing** | Sales with date windows (C6), coupon management (C8), featured products manager (C10) |
| 11 | **CMS** | Section registry, homepage builder, content pages, FAQ, legal, contact form + admin inbox — all bilingual |
| 12 | **Jobs & notifications** | `node-cron` registration; low-stock digest, abandoned cart, quote expiry, sale expiry; the full email template set |
| 13 | **Reports & settings** | Recharts dashboards with date ranges + CSV export; shipping (C11), tax, inventory threshold, notification, general settings; admin users and the role editor; audit log |
| 14 | **Hardening & deploy** | SEO metadata, sitemap, robots, rate limiting, security review, a11y pass, performance, RTL and cross-browser QA, Dockerfile + VPS deployment guide, real credentials swapped in |

---

## 10. Environment variables

```
MONGODB_URI=
MONGODB_DB=

AUTH_CUSTOMER_SECRET=
AUTH_ADMIN_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

RESEND_API_KEY=
MAIL_FROM=
MAIL_DRIVER=console|resend|nodemailer
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false

S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=

NEXT_PUBLIC_SITE_URL=
CRON_ENABLED=true
TZ=Asia/Dubai
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

---

## 11. Non-negotiables

- **No Harvest Calendar** anywhere (C9).
- **Never trust client-supplied prices** — always recompute server-side.
- **The Stripe webhook, not the browser redirect, marks an order paid.**
- Order line items are snapshots; editing a product never mutates history.
- Money is integer fils end to end.
- Product content is bilingual; AR falls back to EN rather than rendering blank.
- Logical CSS properties only — RTL must keep working on every new screen.
- Every admin mutation is permission-checked **server-side**, not just hidden in
  the UI, and written to the audit log.
- The app never moves money on its own beyond taking payment: refunds are manual,
  in Stripe.

---

## 12. Deliberately out of scope

Recorded so it is never re-litigated mid-build:

- Harvest Calendar content (C9).
- Product variants / multiple sizes per product.
- Category landing pages.
- Guest checkout.
- Manual/offline order creation.
- In-app refunds and self-service cancellation.
- International shipping and multi-currency.
- Newsletter signup and WhatsApp/SMS notifications.
- Courier/logistics API integration (status is a manual dropdown, C3).
- Multi-vendor anything — vendor portal, commissions, onboarding (per the PDF).
- Automated tests beyond the pricing engine.

---

## 13. Changelog

| Date | Change |
|---|---|
| 2026-09-10 | **SMTP mail driver.** `MAIL_DRIVER=nodemailer` sends through any SMTP host (`SMTP_HOST` / port / user / pass). Resend and console stay available |
| 2026-09-10 | **Herb Cabinet on phones.** Shelf/form/sort sit behind a Filters toggle (collapsed by default). The "Read before ordering" notice stays on desktop `/shop` only, so products appear in the first viewport |
| 2026-09-09 | **Limited admin roles can reach their sections.** Sign-in and `/admin` send an admin to the first sidebar page their role allows. The denied screen keeps the sidebar, so Products and Reviews stay reachable without Dashboard |
| 2026-09-09 | **Admin lists are paged.** Inventory, orders, products, customers, enquiries, reviews, messages, coupons, sales and admin users load 10 rows at a time. Filter query params are kept when paging. Dashboard, reports, categories, featured and CMS pages stay as they are — those screens need the whole small set, not a growing ledger |
| 2026-09-09 | **Minimum and maximum order quantities.** Set on the product add and edit forms. A customer cannot add, change, enquire or pay a quote outside that range. Minimum defaults to 1; empty maximum means no product cap. A line already in the basket that falls outside a later change blocks checkout until the quantity is fixed |
| 2026-09-09 | **Customer orders list is paged.** `/account/orders` loads 10 orders at a time, newest first, with previous/next. A long history is no longer fetched in one query |
| 2026-09-09 | **Wishlist is paged the same way.** `/account/wishlist` loads 10 saved formulas at a time. Unpublished saves drop out before paging, so a page is not a short list of missing cards |
| 2026-09-09 | **Recommended products** under reviews on the product page: every other published formula in the same category, highest rating first, the rest loaded as the visitor scrolls. The current product is left out. No hand-picked related ids |
| 2026-09-08 | **Policies is one CMS page.** `/legal` is a single storefront page, so the admin Pages list no longer splits it into Legal Notice, Privacy, Terms and Returns. Those records fold into `legal` (heading, intro, and four text sections) and are then removed. The list is Home, Our Method, FAQ, Contact, Policies — navbar order, plus the homepage and the footer policies page. "Still to confirm" notes stay in the editor only |
| 2026-09-04 | Plan created from the scope PDF + the client's custom requirements C1–C11; 20 architecture and behaviour decisions confirmed |
| 2026-09-04 | **Phase 0 complete** — deps installed, `.env.example`, env contract (`src/lib/env.ts`), cached Mongo connection, fils money helpers, `tl()` AR-fallback, stub-capable mail/storage/Stripe drivers, Vitest wired |
| 2026-09-04 | **Phase 1 complete** — 18 Mongoose models with indexes, permission catalogue, settings accessor, seed script. Verified against MongoDB Atlas: Owner role, admin account, settings defaults, 2 categories, the 2 real formulas (bilingual content intact), 8 system CMS pages. Demo products and the 3 demo shelves removed from `src/content` |
| 2026-09-04 | **Phase 2 complete** — customer OTP login (hashed codes, 3-way rate limiting, single use), admin password sign-in with emailed-OTP recovery, forced password change on seeded accounts, separately-signed session cookies, DB-backed permission guards, middleware protection for `/admin`, `/account` and `/checkout`, admin shell with permission-filtered nav, dashboard with live counts, bilingual auth emails. Verified: 20 logic checks plus route-protection and signed-session checks against a running server |
| 2026-09-04 | **Phase 3 complete** — product CRUD with bilingual fields, both pricing modes (C1), permanent discount (C7), image upload, archive/restore; category CRUD with delete guarded by product count; inventory screen with relative stock adjustments; audit log on every mutation. Storage gained a **local driver** (`STORAGE_DRIVER=local`, writes to `public/uploads`) so the catalogue can be built before the client's bucket exists — S3 stays the production driver and the client-side upload code is identical for both. Vocabularies moved to `models/enums.ts` so client components do not pull Mongoose into the browser bundle. Fixed: the locale middleware was rewriting `/api/*` to `/en/api/*`. Verified: 28 validation, money and storage-key checks, plus admin screens and the full upload path (auth, type, size and traversal rejection) against a running server |
| 2026-09-05 | **Phase 14 complete** — sitemap with `hreflang` across both locales, robots excluding every private area, security headers set by the app rather than trusted to the proxy, a health check that reports the database, a multi-stage Dockerfile running as a non-root user with `output: standalone`, compose file, and `docs/DEPLOYMENT.md`. Verified: all five headers present, every admin and account route refuses an anonymous request, the presign and export APIs return 403, the webhook rejects unsigned payloads, and the storefront stays public in both languages |
| 2026-09-05 | **Phase 13 complete** — settings for shipping (C11), tax, the low-stock threshold (C12), review moderation (C2), invoices and notifications, with buttons to run any scheduled job by hand; reports with a revenue chart, best sellers, order stages and low stock over 7/30/90/365 days, plus four CSV exports; a customers list with spend; and the full role editor with the guards that stop an install locking itself out |
| 2026-09-05 | **Phase 12 complete** — five scheduled jobs on in-process `node-cron`: daily low-stock digest (C12), hourly sweep for abandoned carts, quote expiry, finished sales and back-in-stock notices. Every job is safe to run twice and can be run by hand from the admin panel. **The scheduler starts from the root layout, not `instrumentation.ts`** — Next compiles instrumentation for Edge whenever middleware exists, and Mongoose cannot live there. `serverExternalPackages` added for mongoose/mongodb/bcryptjs. 13 job behaviours verified, including that nothing sends twice |
| 2026-09-05 | **Phase 11 complete** — CMS with an 11-type fixed section registry, each mapped onto an existing component; generic page editor (add, reorder, hide, remove) with bilingual fields throughout; homepage, FAQ and the four policy pages seeded from the content files so nothing was lost. A page with no sections keeps its hand-built version, so shipping the CMS could not blank the site. Contact form with honeypot and rate limit, saving to an admin inbox (plan 8.9) |
| 2026-09-05 | **Phase 10 complete** — sales with date windows and pause/resume (C6), coupon management with the all-or-nothing rule stated on the form (C8), and a reorderable featured-products list (C10). A shared searchable product picker backs all three. Coupons that have been redeemed cannot be deleted, only switched off, so the orders that used them keep their history |
| 2026-09-05 | **Phase 9 complete** — the request-price loop closed (C1): admin quotes a unit price with an expiry, the customer gets a single-use link at `/quote/[token]` and pays through the same Stripe checkout. Tokens are 43-character crypto-random, spent on acceptance, and replaced on re-quote so an old link cannot be paid at an old price. Quote emails go out in the enquirer's language. 10 checks verified |
| 2026-09-05 | **Phase 8 complete** — reviews from verified buyers only (a delivered, paid order containing the product, one review per purchase), the moderation toggle (C2) with its "affects new reviews only" semantics, admin queue, and public rating with a per-star distribution. 13 rules verified against the database, including that an undelivered order earns nothing, buying twice earns a second review, and a rejected review leaves the average |
| 2026-09-05 | **Phase 7 complete** — customer portal: dashboard with live counts and recent orders, profile (email deliberately not editable — it is the login identity), address book with default handling, and a wishlist. The heart **hydrates itself from `/api/wishlist`** rather than being server-rendered, so the shop and product pages stay cached; a page of cards costs one shared request, not one per card. Signed-out visitors are sent to sign in and returned to the product. Verified in both languages with a real session |
| 2026-09-05 | **Phase 6 complete** — address book (UAE fields, Emirates list), checkout, Stripe Checkout, the webhook, order records with snapshot line items, customer order pages with a five-stage journey and cancellation requests, admin order list and detail with the status dropdown, courier and tracking (C3), printable bilingual invoices, and the order/low-stock/status email set. Order and invoice numbers come from atomic counters. **Verified against real Stripe test keys**: session creation with AED totals matching to the fils, signature rejection, a genuine CLI-delivered event, and full fulfilment — paid, stock decremented, low-stock alert armed, coupon counted, basket cleared, invoice numbered — plus idempotency on redelivery. Two bugs found by running it: **Stripe Checkout has no Arabic locale** (passing `ar` throws, so Arabic customers could not have paid; they now get `auto`), and invoice numbers collided with order numbers because both prefixes defaulted to `HB` |
| 2026-09-05 | **Phase 5 complete** — server-side cart with a cookie for anonymous shoppers and merge-on-login; add-to-basket with quantity, cart page, coupon field, header badge. Pricing engine gained cart totals, coupon evaluation, shipping and tax — **41 unit tests**. C8's all-or-nothing rule implemented and verified: a coupon covering only some of the basket is rejected outright and names the offending product. Carts store ids and quantities only, never prices, so a basket left open across a price change, a sale ending or a coupon expiring is re-judged on every read. Lines that become unbuyable are shown, excluded from totals, and block checkout until cleared. **Interpretation to confirm:** free shipping is judged on the goods total *after* the coupon (plan §6 orders coupon before shipping) |
| 2026-09-05 | **Categories became two-level.** The client supplied `docs/Products categories.docx` — four groupings, seven subcategories, both languages — which supersedes the scope PDF's flat "Indication Categories". Products sit on subcategories only; a parent expands to its children. Adds `parentId` with a depth guard, a tree editor and grouped product picker in admin, a two-level shop filter (parent chips reveal their shelves), and a reseed that retires the two placeholder shelves once nothing points at them |
| 2026-09-05 | **Phase 4 complete** — storefront reads MongoDB. Shop with server-side search, shelf/form filters, five sorts and pagination (every view has its own URL, works without JS); product page rebuilt with the three buy states — price, request-price enquiry form (C1), and out-of-stock with a notify-me capture (plan 8.7); "Only X left" from the global threshold (C12); related products from the same category; homepage Featured section from the admin flag (C10). Pricing engine's product level built with **23 unit tests** — sale vs permanent discount, larger wins, never stacks (C7). The two real formulas are now **published as request-price**: their pricing is genuinely unconfirmed and an enquiry form is the honest state. Verified against the database with temporary fixtures covering discounted, low-stock, out-of-stock and on-sale products in both languages |
| 2026-09-04 | C12 (low-stock: admin panel + admin email + public "only X left") added. All 9 open questions closed plus 11 further decisions: UAE-only shipping, no manual orders, manual Stripe refunds, cancellation-requests, no category pages, single global stock threshold, instant + daily low-stock alerts, notify-me on out-of-stock, node-cron (hosting settled as VPS/persistent Node), contact form + admin inbox, charts + CSV reports, no variants, pricing-engine-only tests, stub credentials, S3 retained, admin OTP password reset, automatic related products, abandoned-cart email, no newsletter/WhatsApp. Open-questions section removed; out-of-scope section added |
