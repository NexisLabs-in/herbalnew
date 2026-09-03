import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND, NAV, UI } from "@/content/brand";
import { FORM_LABELS, PRODUCTS, SHELVES } from "@/content/products";
import { Advisory, PageHead } from "@/components/Blocks";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { ShopFilters } from "@/components/ShopFilters";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(NAV[0].label, locale), description: t(BRAND.supporting, locale) };
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const shelves = SHELVES.map((shelf, index) => {
    const products = PRODUCTS.filter((p) => p.shelf === shelf.id);
    return {
      id: shelf.id,
      header: (
        <Reveal>
          <div>
            <p className="eyebrow">{String(index + 1).padStart(2, "0")}</p>
            <h2 className="display d3" style={{ marginTop: ".75rem" }}>
              {t(shelf.name, locale)}
            </h2>
            <p className="body small">{t(shelf.note, locale)}</p>
          </div>
        </Reveal>
      ),
      products: products.map((product, i) => ({
        key: product.id,
        form: product.form,
        node: <ProductCard product={product} locale={locale} delay={i * 90} />,
      })),
    };
  });

  return (
    <>
      <PageHead
        kicker={t(BRAND.tagline, locale)}
        title={t(NAV[0].label, locale)}
        sub={t(BRAND.supporting, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(NAV[0].label, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div
            style={{
              display: "flex", flexWrap: "wrap", gap: "1.5rem",
              alignItems: "center", justifyContent: "space-between",
            }}
          >
            <dl style={{ display: "flex", gap: "2.25rem", order: 1 }}>
              <div>
                <dt className="data-label">{t(UI.formulas, locale)}</dt>
                <dd className="display d4" style={{ margin: ".3rem 0 0" }}>{PRODUCTS.length}</dd>
              </div>
              <div>
                <dt className="data-label">{t(UI.shelves, locale)}</dt>
                <dd className="display d4" style={{ margin: ".3rem 0 0" }}>{SHELVES.length}</dd>
              </div>
            </dl>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <Advisory locale={locale} />
          </div>

          <div style={{ marginTop: "2.5rem" }}>
            <ShopFilters
              options={[
                { value: "all", label: t(UI.allFormulas, locale) },
                { value: "oil", label: t(FORM_LABELS.oil, locale) },
                { value: "powder", label: t(FORM_LABELS.powder, locale) },
              ]}
              shelves={shelves}
            />
          </div>
        </div>
      </section>
    </>
  );
}
