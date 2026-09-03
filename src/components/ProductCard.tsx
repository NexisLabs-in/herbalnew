import Link from "next/link";
import Image from "next/image";
import { UI } from "@/content/brand";
import { getShelf, type Product } from "@/content/products";
import { formatAed, localePath, t, type Locale } from "@/lib/i18n";
import { Reveal } from "./Reveal";

export function ProductCard({
  product,
  locale,
  delay = 0,
}: {
  product: Product;
  locale: Locale;
  delay?: number;
}) {
  const href = localePath(locale, `/shop/${product.slug}`);
  const shelf = getShelf(product.shelf);
  const name = t(product.name, locale);
  const price = formatAed(product.priceAed, locale);
  const photo = product.media.photo;
  const mediaAlt = photo && product.media.photoAlt
    ? t(product.media.photoAlt, locale)
    : `${name} — ${t(product.formLabel, locale).toLowerCase()}`;

  return (
    <Reveal as="article" className="card card--lift product-card" data-form={product.form} delay={delay}>
      <Link href={href} aria-label={name}>
        <div className={`product-card__media${photo ? " product-card__media--photo" : ""}`}>
          <div className="product-card__badges">
            <span className="chip chip--gold">{t(product.formLabel, locale)}</span>
            <span className="chip chip--dot">{t(UI.inPreparation, locale)}</span>
          </div>
          <Image
            className={photo ? "product-card__photo" : "product-card__img"}
            src={`/img/${photo ?? product.media.pack}`}
            alt={mediaAlt}
            width={photo ? 800 : 400}
            height={photo ? 800 : 660}
          />
        </div>
      </Link>

      <div className="product-card__body">
        {shelf ? <p className="product-card__concern">{t(shelf.name, locale)}</p> : null}
        <h3 className="product-card__name">
          <Link href={href}>{name}</Link>
        </h3>
        <p className="product-card__sum">{t(product.summary, locale)}</p>

        <dl className="product-card__specs">
          <div>
            <dt>{t(UI.targetGroup, locale)}</dt>
            <dd>{t(product.safety.targetGroup, locale)}</dd>
          </div>
          <div>
            <dt>{t(UI.shelfLife, locale)}</dt>
            <dd>
              {product.shelfLifeMonths} {t(UI.months, locale)}
            </dd>
          </div>
        </dl>

        <div className="product-card__foot">
          {price ? (
            <span className="price">{price}</span>
          ) : (
            <span className="price price--pending">{t(UI.pricePending, locale)}</span>
          )}
          <Link className="link-arrow" href={href}>
            <span>{t(UI.viewFormula, locale)}</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
