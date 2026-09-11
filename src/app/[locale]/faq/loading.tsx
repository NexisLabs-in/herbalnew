/** FAQ soft-nav skeleton — hero band plus accordion rows. */
export default function FaqLoading() {
  const rows = Array.from({ length: 8 });

  return (
    <div className="faq-page" aria-busy="true" aria-live="polite">
      <header className="faq-hero">
        <div className="shell shell--wide faq-hero__copy">
          <div className="skel skel--crumb" />
          <div className="skel skel--title" style={{ marginTop: ".55rem", maxWidth: "10ch" }} />
          <div
            className="skel skel--lead"
            style={{ marginTop: ".55rem", maxWidth: "42ch", height: "3.2rem" }}
          />
        </div>
      </header>

      <div className="faq-page__body">
        <div className="shell shell--wide">
          <div className="page-loading__acc">
            {rows.map((_, i) => (
              <div className="page-loading__acc-row" key={i}>
                <div className="skel page-loading__acc-num" />
                <div
                  className="skel page-loading__acc-q"
                  style={{ maxWidth: i % 2 === 0 ? "72%" : "58%" }}
                />
              </div>
            ))}
          </div>
          <div className="skel page-loading__faq-close" />
        </div>
      </div>

      <span className="visually-hidden">Loading FAQ…</span>
    </div>
  );
}
