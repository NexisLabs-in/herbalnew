/** Skeleton for the catalogue body while a shelf/sort/search navigation
 *  re-runs the server component. Kept separate from the route loading.tsx so
 *  the hero can stay mounted during in-page filter changes. */
export function ShopListingSkeleton() {
  const cards = Array.from({ length: 8 });

  return (
    <div className="shop-listing-skeleton" aria-busy="true" aria-live="polite">
      <div className="shop-loading__panel">
        <div className="shop-loading__panel-intro">
          <div className="skel skel--panel-title" />
          <div className="skel skel--panel-sub" />
        </div>
        <div className="shop-loading__panel-tiles">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skel skel--tile" key={i} />
          ))}
        </div>
      </div>

      <div className="shop-controls">
        <div className="skel" style={{ width: "5.5rem", height: ".875rem" }} />
        <div className="shop-loading__toolbar">
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="skel skel--filter-pill" key={i} />
          ))}
        </div>
      </div>

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

      <span className="visually-hidden">Loading the cabinet…</span>
    </div>
  );
}
