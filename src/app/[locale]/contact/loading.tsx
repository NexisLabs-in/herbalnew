/** Contact soft-nav skeleton — details column and form card. */
export default function ContactLoading() {
  return (
    <div className="contact" aria-busy="true" aria-live="polite">
      <div className="shell shell--wide">
        <div className="skel skel--crumb" style={{ marginBottom: "1.35rem" }} />

        <div className="contact__layout">
          <div className="contact__aside">
            <div className="skel skel--eyebrow" />
            <div className="skel skel--title" style={{ marginTop: ".85rem", maxWidth: "14ch" }} />
            <div
              className="skel skel--lead"
              style={{ marginTop: "1.1rem", maxWidth: "42ch", height: "3.4rem" }}
            />

            <div className="page-loading__contact-details">
              <div className="page-loading__contact-field page-loading__contact-field--wide">
                <div className="skel skel--stat-label" />
                <div className="skel page-loading__contact-email" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="page-loading__contact-field" key={i}>
                  <div className="skel skel--stat-label" />
                  <div className="skel page-loading__contact-value" />
                </div>
              ))}
            </div>
          </div>

          <div className="contact__form page-loading__contact-form">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="page-loading__form-field" key={i}>
                <div className="skel skel--stat-label" />
                <div className="skel page-loading__form-input" />
              </div>
            ))}
            <div className="skel page-loading__form-btn" />
          </div>
        </div>

        <div className="contact__note">
          <div className="skel skel--advisory-label" />
          <div className="skel skel--advisory-line" style={{ marginTop: ".85rem" }} />
          <div className="skel skel--advisory-line" />
          <div className="skel skel--advisory-line" style={{ width: "70%" }} />
        </div>
      </div>

      <span className="visually-hidden">Loading contact…</span>
    </div>
  );
}
