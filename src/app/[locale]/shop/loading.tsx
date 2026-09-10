/** Skeleton for the Herb Cabinet while the catalogue re-renders — first visit,
 *  or a shelf/sort/page change, since those are query-param navigations that
 *  re-run the same async server component rather than a client-side filter. */
export default function ShopLoading() {
  const cards = Array.from({ length: 8 });

  return (
    <div aria-busy="true" aria-live="polite">
      <div className="page-head page-head--shop">
        <div className="shell shell--wide">
          <div className="skel skel--crumb" />
          <div className="skel skel--eyebrow" />
          <div className="skel skel--title" />
          <div className="skel skel--lead" />
        </div>
      </div>

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="shop-loading__stats">
            <div>
              <div className="skel skel--stat-label" />
              <div className="skel skel--stat-value" />
            </div>
            <div>
              <div className="skel skel--stat-label" />
              <div className="skel skel--stat-value" />
            </div>
          </div>

          <div className="shop-loading__advisory">
            <div className="skel skel--advisory-label" />
            <div className="skel skel--advisory-line" />
            <div className="skel skel--advisory-line" />
            <div className="skel skel--advisory-line" />
          </div>

          <div className="shop-loading__panel" style={{ marginTop: "2.5rem" }}>
            <div className="shop-loading__panel-intro">
              <div className="skel skel--panel-eyebrow" />
              <div className="skel skel--panel-title" />
              <div className="skel skel--panel-sub" />
            </div>
            <div className="shop-loading__panel-tiles">
              {Array.from({ length: 5 }).map((_, i) => (
                <div className="skel skel--tile" key={i} />
              ))}
            </div>
          </div>

          <div className="shop-loading__toolbar">
            <div className="skel skel--search" />
            <div className="skel skel--filter-pill" />
            <div className="skel skel--filter-pill" />
          </div>

          <div className="product-grid shop-loading__grid">
            {cards.map((_, i) => (
              <div className="skel-card" key={i}>
                <div className="skel skel--card-media" />
                <div className="skel-card__body">
                  <div className="skel skel--card-name" />
                  <div className="skel skel--card-sum" />
                  <div className="skel skel--card-sum" />
                  <div className="skel skel--card-foot" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <span className="visually-hidden">Loading the cabinet…</span>
    </div>
  );
}
