import { ShopListingSkeleton } from "@/components/ShopListingSkeleton";

/** Skeleton for the Herb Cabinet while the catalogue re-renders — first visit,
 *  or a shelf/sort/page change, since those are query-param navigations that
 *  re-run the same async server component rather than a client-side filter. */
export default function ShopLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <section className="shop-hero">
        <div className="shop-hero__media" aria-hidden>
          <div className="skel" style={{ width: "100%", height: "100%" }} />
        </div>
        <div className="shell shell--wide shop-hero__content">
          <div className="shop-hero__copy">
            <div className="skel skel--eyebrow" />
            <div className="skel skel--title" style={{ marginTop: ".85rem" }} />
            <div className="skel skel--lead" style={{ marginTop: "1rem", maxWidth: "42ch" }} />
            <div className="shop-hero__trust" style={{ marginTop: "1.25rem" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: ".5rem" }}>
                  <div className="skel" style={{ width: 48, height: 48, borderRadius: "50%" }} />
                  <div className="skel" style={{ width: "70%", height: ".75rem" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section--tight shop-page">
        <div className="shell shell--wide">
          <ShopListingSkeleton />
        </div>
      </section>
    </div>
  );
}
