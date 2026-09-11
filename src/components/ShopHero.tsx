import { NAV } from "@/content/brand";
import { SHOP, SHOP_TRUST } from "@/content/shop";
import { Icon } from "@/components/Icon";
import { t, type Locale } from "@/lib/i18n";

/** Herb Cabinet intro — a light two-column band rather than the interior
 *  page-head treatment, which left too much air above the category panel. */
export function ShopHero({ locale }: { locale: Locale }) {
  return (
    <section className="shop-hero">
      <div className="shell shell--wide shop-hero__grid">
        <div className="shop-hero__copy">
          <p className="eyebrow">{t(NAV[0].label, locale)}</p>
          <h1 className="display d3 shop-hero__title">{t(SHOP.heroTitle, locale)}</h1>
          <p className="shop-hero__sub">{t(SHOP.heroSub, locale)}</p>
        </div>

        <ul className="shop-hero__trust">
          {SHOP_TRUST.map((item) => (
            <li key={item.icon}>
              <span className="shop-hero__trust-icon" aria-hidden="true">
                <Icon name={item.icon} size={22} strokeWidth={1.3} />
              </span>
              <span className="shop-hero__trust-label">{t(item.label, locale)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
