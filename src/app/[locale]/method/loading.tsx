/** Our Method soft-nav skeleton — intro split, steps, and values index. */
export default function MethodLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="page-head">
        <div className="shell shell--wide">
          <div className="skel skel--crumb" />
          <div className="skel skel--eyebrow" style={{ marginTop: "1.6rem" }} />
          <div className="skel skel--title" style={{ marginTop: "1rem" }} />
          <div className="skel skel--lead" style={{ marginTop: "1.1rem", maxWidth: "52ch" }} />
        </div>
      </div>

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="grid grid--split">
            <div className="panel card__pad page-loading__panel-box">
              <div className="skel skel--eyebrow" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div className="page-loading__tick" key={i}>
                  <div className="skel page-loading__tick-icon" />
                  <div className="skel page-loading__tick-text" />
                </div>
              ))}
            </div>
            <div>
              <div className="skel skel--lead" style={{ maxWidth: "48ch" }} />
              <div className="skel skel--block" style={{ marginTop: "1.1rem" }} />
              <div className="skel skel--block" style={{ marginTop: "1.1rem", width: "92%" }} />
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-paper" style={{ borderBlock: "1px solid var(--color-line)" }}>
        <div className="shell shell--wide">
          <div className="skel skel--eyebrow" />
          <div className="skel skel--title" style={{ marginTop: ".85rem", maxWidth: "16ch" }} />
          <div className="skel skel--lead" style={{ marginTop: ".75rem", maxWidth: "36ch", height: "1.2rem" }} />

          <div className="page-loading__steps">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="page-loading__step" key={i}>
                <div className="skel page-loading__step-dot" />
                <div className="page-loading__step-copy">
                  <div className="skel page-loading__step-title" />
                  <div className="skel page-loading__step-detail" />
                  <div className="skel page-loading__step-detail" style={{ width: "75%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell shell--wide">
          <div className="skel skel--eyebrow" />
          <div className="skel skel--title" style={{ marginTop: ".85rem", maxWidth: "20ch" }} />

          <div className="page-loading__values">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="page-loading__values-row" key={i}>
                <div className="skel page-loading__values-num" />
                <div className="skel page-loading__values-text" />
              </div>
            ))}
          </div>

          <div className="skel page-loading__method-cta" />
        </div>
      </section>

      <span className="visually-hidden">Loading our method…</span>
    </div>
  );
}
