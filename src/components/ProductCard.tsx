import Link from "next/link";
import Image from "next/image";
import { UI } from "@/content/brand";
import { SHOP } from "@/content/shop";
import type { ProductCardView } from "@/lib/catalogue";
import { localePath, t, tl, type Locale } from "@/lib/i18n";
import { Price } from "./Price";
import { Reveal } from "./Reveal";
import { WishlistButton } from "./storefront/WishlistButton";
import { StockLine } from "./StockLine";

export function ProductCard({
  product,
  locale,
  delay = 0,
  wishlist,
  variant = "full",
  reveal = true,
}: {
  product: ProductCardView;
  locale: Locale;
  delay?: number;
  /** Off for cards that are already in the first viewport — a scroll reveal
   *  there just leaves the grid looking empty until the visitor scrolls. */
  reveal?: boolean;
  /** Show the save-for-later heart. Omitted where it would be noise — the
   *  homepage, related products. The button loads its own state. */
  wishlist?: boolean;
  /** Cabinet grid: category, name and summary only — no price row or specs. */
  variant?: "full" | "cabinet";
}) {
  const cabinet = variant === "cabinet";
  const href = localePath(locale, `/shop/${product.slug}`);
  const name = tl(product.name, locale);
  const image = product.image;

  // Packshots are vectors on a plinth; photographs are full-bleed crops. The
  // frame changes accordingly, which is why the kind is stored per image.
  const isPhoto = image?.kind === "photo";
  const alt = image ? tl(image.alt, locale) || name : name;

  const Frame = reveal ? Reveal : "article";
  const frameProps = reveal ? { as: "article" as const, delay } : {};

  return (
    <Frame
      className={`card card--lift product-card${cabinet ? " product-card--cabinet" : ""}`}
      data-form={product.form}
      {...frameProps}
    >
      {/* The heart sits over the media but outside the link: a button nested
          inside an anchor is invalid, and the click would navigate instead of
          saving. */}
      <div className="product-card__frame">
        {wishlist ? (
          <span className="product-card__wish">
            <WishlistButton productId={product.id} locale={locale} returnTo={href} />
          </span>
        ) : null}

        <Link href={href} aria-label={name}>
          <div className={`product-card__media${isPhoto ? " product-card__media--photo" : ""}`}>
          <div className={`product-card__badges${wishlist ? " product-card__badges--wish" : ""}`}>
            {product.formLabel.en || product.formLabel.ar ? (
              <span className="chip chip--brand">{tl(product.formLabel, locale)}</span>
            ) : null}
            {product.price?.source && product.price.source !== "none" ? (
              <span className="chip chip--sale">
                {product.price.percentOff}% {t(SHOP.off, locale)}
              </span>
            ) : null}
            {product.stockState === "out" ? (
              <span className="chip chip--muted">{t(SHOP.outOfStock, locale)}</span>
            ) : null}
          </div>

          {image ? (
            <Image
              className={isPhoto ? "product-card__photo" : "product-card__img"}
              src={image.url}
              alt={alt}
              width={isPhoto ? 800 : 400}
              height={isPhoto ? 800 : 660}
              // Uploaded images come from the bucket or the local uploads
              // directory, neither of which is a configured optimiser domain.
              unoptimized={!image.url.startsWith("/img/")}
            />
          ) : (
            <div className="product-card__img product-card__img--none" aria-hidden="true" />
            )}
          </div>
        </Link>
      </div>

      <div className="product-card__body">
        {product.categoryName ? (
          <p className="product-card__concern">{tl(product.categoryName, locale)}</p>
        ) : null}

        <h3 className="product-card__name">
          <Link href={href}>{name}</Link>
        </h3>

        {tl(product.summary, locale) ? (
          <p className="product-card__sum">{tl(product.summary, locale)}</p>
        ) : null}

        {!cabinet ? (
          <dl className="product-card__specs">
            {tl(product.targetGroup, locale) ? (
              <div>
                <dt>{t(UI.targetGroup, locale)}</dt>
                <dd>{tl(product.targetGroup, locale)}</dd>
              </div>
            ) : null}
            {product.shelfLifeMonths ? (
              <div>
                <dt>{t(UI.shelfLife, locale)}</dt>
                <dd>
                  {product.shelfLifeMonths} {t(UI.months, locale)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {!cabinet ? (
          <div className="product-card__foot">
            <span className="product-card__price">
              <Price price={product.price} locale={locale} size="sm" />
              {product.stockState !== "out" ? (
                <StockLine state={product.stockState} stock={product.stock} locale={locale} />
              ) : null}
            </span>
            <Link className="link-arrow" href={href}>
              <span>{t(UI.viewFormula, locale)}</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        ) : null}
      </div>
    </Frame>
  );
}
