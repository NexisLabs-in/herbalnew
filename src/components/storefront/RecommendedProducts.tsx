"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { SHOP } from "@/content/shop";
import type { ProductCardView } from "@/lib/catalogue";
import { t, type Locale } from "@/lib/i18n";
import { loadRecommendedPage } from "@/server/actions/recommended";

/** Same-shelf formulas, loaded a page at a time as the sentinel nears the
 *  viewport. The first page arrives with the document so the section is not
 *  empty until JavaScript runs. */
export function RecommendedProducts({
  initial,
  total,
  categoryId,
  excludeId,
  locale,
}: {
  initial: ProductCardView[];
  total: number;
  categoryId: string;
  excludeId: string;
  locale: Locale;
}) {
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const done = items.length >= total;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || done) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || busy.current) return;
        busy.current = true;
        setLoading(true);

        const next = page + 1;
        void loadRecommendedPage(categoryId, excludeId, next)
          .then((result) => {
            setItems((current) => {
              const seen = new Set(current.map((item) => item.id));
              return [...current, ...result.products.filter((item) => !seen.has(item.id))];
            });
            setPage(next);
          })
          .finally(() => {
            busy.current = false;
            setLoading(false);
          });
      },
      { rootMargin: "320px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [categoryId, excludeId, done, page]);

  if (total === 0) return null;

  return (
    <section className="section bg-paper" style={{ borderBlockStart: "1px solid var(--color-line)" }}>
      <div className="shell shell--wide">
        <h2 className="display d3">{t(SHOP.recommendedTitle, locale)}</h2>
        <div className="product-grid" style={{ marginTop: "clamp(1.5rem,3vw,2.5rem)" }}>
          {items.map((item) => (
            <ProductCard key={item.id} product={item} locale={locale} />
          ))}
        </div>
        <div ref={sentinel} className="recommended__more" aria-hidden={done}>
          {loading ? <p>{t(SHOP.recommendedLoading, locale)}</p> : null}
        </div>
      </div>
    </section>
  );
}
