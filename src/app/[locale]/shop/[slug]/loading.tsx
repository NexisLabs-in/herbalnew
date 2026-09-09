/** Skeleton while a product page (from shop, featured, etc.) is loading. */
export default function ProductLoading() {
  return (
    <div className="pdp-loading" aria-busy="true" aria-live="polite">
      <div className="page-head page-head--product">
        <div className="shell shell--wide">
          <div className="skel skel--crumb" />
          <div className="skel skel--eyebrow" />
          <div className="skel skel--title" />
          <div className="skel skel--lead" />
        </div>
      </div>
      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="pdp">
            <div className="pdp-loading__gallery">
              <div className="skel skel--stage" />
              <div className="pdp-loading__thumbs">
                <div className="skel skel--thumb" />
                <div className="skel skel--thumb" />
                <div className="skel skel--thumb" />
              </div>
            </div>
            <div className="pdp-loading__copy">
              <div className="skel skel--chips" />
              <div className="skel skel--facts" />
              <div className="skel skel--price" />
              <div className="skel skel--cta" />
              <div className="skel skel--block" />
              <div className="skel skel--block" />
            </div>
          </div>
        </div>
      </section>
      <span className="visually-hidden">Loading product…</span>
    </div>
  );
}
