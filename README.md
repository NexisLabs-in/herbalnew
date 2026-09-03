# HERBEDIA — Premium Theme (Next.js)

The premium redesign of `herb.nexislabs.in`, built on the same stack as the
existing app: **Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4**.

**All copy is transcribed verbatim from the live site, in both languages.**
English from `/en`, Arabic from `/ar` — nothing invented, shortened or reworded.

```bash
npm install
npm run dev      # http://localhost:3000  ->  redirects to /en
npm run build && npm start
```

---

## Routes

Every page is statically prerendered in both locales (16 pages + 404).

| Route | Page |
|---|---|
| `/[locale]` | Home |
| `/[locale]/shop` | Herb Cabinet |
| `/[locale]/shop/[slug]` | Formula detail (`hair-growth`, `prostate-health`) |
| `/[locale]/method` | Our Method |
| `/[locale]/faq` | FAQ |
| `/[locale]/contact` | Contact |
| `/[locale]/legal` | Policies |

`src/middleware.ts` sends bare paths to a locale prefix, picking from
`Accept-Language` and falling back to `en`.

## Structure

```
src/
  app/
    layout.tsx              root; imports globals.css
    globals.css             @theme tokens + component layer
    [locale]/
      layout.tsx            <html lang dir>, next/font, Header + Footer
      page.tsx              home
      shop/, method/, faq/, contact/, legal/
  components/               Header, Footer, ProductCard, Accordion, Gallery,
                            ShopFilters, MethodSteps, TraditionsRibbon,
                            Reveal, Icon, Blocks
  content/                  brand.ts, products.ts, pages.ts, legal.ts
  lib/i18n.ts               Locale, dir(), localePath(), formatAed(), t()
public/img/                 packshots, cartons, botanical plates, brand mark
```

### Content

Every string is a `{ en, ar }` pair (`type L`), read with `t(value, locale)` —
the same shape the current app already uses, so records port across directly.
To change copy, edit `src/content/*`; nothing in the components holds text.

`src/content/products.ts` is the product model. It carries `priceAed`,
`netQuantity`, `batch` and `available` as nullable/false because they are all
unconfirmed upstream. Populate them and the storefront switches from the
"not yet on sale / enquire" state to a real price automatically —
`formatAed()` and the buy panel are already wired for it.

## Design tokens

`src/app/globals.css` declares the palette in Tailwind v4's `@theme`, so every
scale generates utilities as well as CSS variables:

```
bg-forest-800   text-gold-500   border-line-strong   font-display   ease-brand
```

The existing app's `--color-ink`, `--color-line`, `--color-leaf`, `--color-clay`
and all three typefaces (Newsreader / Schibsted Grotesk / JetBrains Mono) are
kept unchanged. What's new is the deep bottle-green scale, the antique-brass
accent, an ivory ground scale and a layered shadow set.

Component classes live in `@layer components`, so any Tailwind utility still
wins over them — mix freely.

## Arabic / RTL

Arabic is a first-class locale, not a mirror stylesheet. The layout uses logical
properties throughout (`inset-inline`, `border-inline-end`, `margin-inline`,
`text-start`), so `dir="rtl"` on `<html>` is all that flips it. Two deliberate
adjustments:

- `[dir="rtl"]` swaps the font stacks to Amiri + IBM Plex Sans Arabic.
- Forward-arrow glyphs are flipped with `scaleX(-1)`, since `→` means
  "onward" and has to point the other way in RTL.

## Images

`public/img/*.svg` are art-directed vector packshots authored for this project:
license-clean, editable and lossless at any size.

### Swapping in real photography

The model already supports it. Drop a file into `public/img/` and add one line
to the product in `src/content/products.ts`:

```ts
media: {
  pack: "packshot-oil.svg",
  carton: "carton-oil.svg",
  plate: "plate-hair.svg",
  photo: "hair-growth.jpg",                       // <- add this
  photoAlt: { en: "…", ar: "…" },                 // <- and this
},
```

The card and the product gallery both switch from vector-on-plinth to a
full-bleed crop automatically (`.product-card__media--photo`, `.pdp__stage--photo`).
The vector packshot stays available as a secondary gallery view.

### Why there are no stock photos here yet

Free/CC0 sources were searched and rejected. The Openverse public-domain pool
(Flickr, Wikimedia, Rawpixel) has no premium cosmetic or supplement product
photography — the closest results are museum ceramics, kitchen snapshots and
food shots that would make the storefront look *worse* than the vectors.
Unsplash and Pexels both require API keys or block automated access, and
Wikimedia's herb photography is almost entirely CC BY-SA, which is unsuitable
for a commercial storefront.

The interim answer is **licensed stock**, bought once against the client's own
account. What to search for:

| Where it goes | Search terms |
|---|---|
| Hair Growth | amber dropper bottle, hair serum bottle, botanical oil on stone |
| Prostate Health | kraft pouch dried herbs, loose herbal blend, herbal infusion in glass |
| Shelf / hero | dark moody botanicals, dried herb still life, apothecary flat lay |

Adobe Stock, iStock and Unsplash+ all cover this for roughly $10–30 an image, or
a small subscription. Buy portrait or square crops on plain, light backgrounds
so they sit in the existing frames without re-art-directing the cards.

The eventual answer is a product shoot — but the formulas are pre-launch and
final packaging does not exist yet, so licensed stock is the right bridge.

## Accessibility

Skip link, visible focus rings, `aria-expanded`/`aria-controls` on accordions,
`role="tablist"` on the gallery, `aria-current` on nav, `aria-pressed` on
filters. `prefers-reduced-motion` disables the float, marquee and reveals, and a
`<noscript>` override keeps reveal content visible when scripts do not run.

## Known upstream gaps

Carried over from the live site, not introduced here:

- `/ar/shop` and `/ar/faq` serve **English** meta descriptions. Kept as-is
  rather than inventing Arabic — worth fixing with real copy.
- The Arabic FAQ page has no subtitle where English has one; matched per locale.
- Prices, net quantity, batch numbers and plant-compound profiles are all
  `Awaiting confirmation`.
