import Image from "next/image";
import { NAV } from "@/content/brand";
import { SHOP, SHOP_TRUST } from "@/content/shop";
import { Icon } from "@/components/Icon";
import { t, type Locale } from "@/lib/i18n";

/** Herb Cabinet intro — copy over the banner's built-in left negative space. */
export function ShopHero({ locale }: { locale: Locale }) {
  return (
    <section className="shop-hero">
      <div className="shop-hero__media" aria-hidden="true">
        <Image
          src="/img/cabinet-banner.png"
          alt=""
          fill
          priority
          className="shop-hero__banner"
          sizes="100vw"
        />
      </div>

      <div className="shell shell--wide shop-hero__content">
        <div className="shop-hero__copy">
          <p className="eyebrow">{t(NAV[0].label, locale)}</p>
          <h1 className="display d3 shop-hero__title">{t(SHOP.heroTitle, locale)}</h1>
          <p className="shop-hero__sub">{t(SHOP.heroSub, locale)}</p>

          <ul className="shop-hero__trust">
            {SHOP_TRUST.map((item) => (
              <li key={item.icon}>
                <span className="shop-hero__trust-icon" aria-hidden="true">
                  <Icon name={item.icon} size={26} strokeWidth={1.35} />
                </span>
                <span className="shop-hero__trust-label">{t(item.label, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
