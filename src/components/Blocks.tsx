import { ADVISORY, UI } from "@/content/brand";
import { t, type Locale } from "@/lib/i18n";

/** The "Read before ordering" notice. Legally required on every surface — the
 *  design gives it a panel so it reads as care, not as a defensive footnote. */
export function Advisory({ locale, dark = false }: { locale: Locale; dark?: boolean }) {
  return (
    <aside className={dark ? "advisory advisory--dark" : "advisory"}>
      <p className="advisory__label">{t(UI.readBeforeBuying, locale)}</p>
      <p className="advisory__text">{t(ADVISORY, locale)}</p>
    </aside>
  );
}

export type Crumb = { label: string; href?: string };

export function PageHead({
  kicker,
  title,
  sub,
  crumbs,
  compact = false,
  className,
}: {
  kicker: string;
  title: string;
  sub?: string;
  crumbs?: Crumb[];
  className?: string;
  /** For pages somebody is *doing* something on — a basket, a checkout, a
   *  receipt — rather than browsing. The full treatment is sized to introduce
   *  a page worth exploring; on a page with one card on it, it becomes a
   *  display-size heading floating above the thing that matters. */
  compact?: boolean;
}) {
  return (
    <section className={["page-head", compact ? "page-head--compact" : "", className].filter(Boolean).join(" ")}>
      <div className="shell shell--wide">
        {crumbs?.length ? (
          <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: compact ? "1rem" : "1.6rem" }}>
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} style={{ display: "contents" }}>
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {c.href ? <a href={c.href}>{c.label}</a> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        ) : null}
        <p className="eyebrow">{kicker}</p>
        <h1 className={compact ? "display d3" : "display d2"} style={className ? undefined : { marginTop: compact ? ".7rem" : "1rem" }}>
          {title}
        </h1>
        {sub ? (
          <p
            className={compact ? "body" : "lead"}
            style={className ? undefined : { marginTop: compact ? ".7rem" : "1.1rem", maxWidth: "60ch" }}
          >
            {sub}
          </p>
        ) : null}
      </div>
    </section>
  );
}
