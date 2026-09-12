/** Skeleton for the product grid only — filters stay mounted with instant selection. */
export function ShopProductGridSkeleton() {
  const cards = Array.from({ length: 8 });

  return (
    <div className="shop-product-grid-skeleton" aria-busy="true" aria-live="polite">
      <div className="product-grid shop-page__grid">
        {cards.map((_, i) => (
          <div className="skel-card" key={i}>
            <div className="skel skel--card-media" />
            <div className="skel-card__body">
              <div className="skel skel--card-name" />
              <div className="skel skel--card-sum" />
              <div className="skel skel--card-sum" />
            </div>
          </div>
        ))}
      </div>
      <span className="visually-hidden">Loading products…</span>
    </div>
  );
}
