/** Skeleton for the catalogue body while a shelf/sort/search navigation
 *  re-runs the server component. Kept separate from the route loading.tsx so
 *  the hero can stay mounted during in-page filter changes. */
export function ShopListingSkeleton() {
  const cards = Array.from({ length: 8 });

  return (
    <div className="shop-listing-skeleton" aria-busy="true" aria-live="polite">
      <div className="shop-category-section">
        <div className="shop-category-section__head">
          <div className="shop-category-section__intro">
            <div className="skel skel--eyebrow" />
            <div className="skel skel--panel-title" style={{ marginTop: ".55rem" }} />
          </div>
        </div>
        <div className="shop-shelf-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="skel shop-shelf-card-skeleton" key={i} />
          ))}
        </div>
        <div className="shop-sub-pills">
          {Array.from({ length: 2 }).map((_, i) => (
            <div className="skel skel--filter-pill" key={i} style={{ width: "9rem", height: "2.1rem", borderRadius: "999px" }} />
          ))}
        </div>
      </div>

      <div className="shop-listing-toolbar">
        <div className="skel" style={{ width: "5.5rem", height: ".875rem" }} />
        <div className="shop-listing-toolbar__sort">
          {Array.from({ length: 4 }).map((_, i) => (
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
