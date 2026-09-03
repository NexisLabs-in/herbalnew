import { ADVISORY, UI } from "@/content/brand";
import { t, type Locale } from "@/lib/i18n";
import { Reveal } from "./Reveal";

/** The "Read before ordering" notice. Legally required on every surface — the
 *  design gives it a panel so it reads as care, not as a defensive footnote. */
export function Advisory({ locale, dark = false }: { locale: Locale; dark?: boolean }) {
  return (
    <Reveal className={dark ? "panel panel--dark" : "panel panel--advisory"}>
      <p className="eyebrow eyebrow--plain">{t(UI.readBeforeBuying, locale)}</p>
      <p className="body" style={{ marginTop: ".9rem", maxWidth: "82ch" }}>
        {t(ADVISORY, locale)}
      </p>
    </Reveal>
  );
}

export type Crumb = { label: string; href?: string };

export function PageHead({
  kicker,
  title,
  sub,
  crumbs,
}: {
  kicker: string;
  title: string;
  sub?: string;
  crumbs?: Crumb[];
}) {
  return (
    <section className="page-head">
      <div className="shell shell--wide">
        {crumbs?.length ? (
          <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: "1.6rem" }}>
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} style={{ display: "contents" }}>
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {c.href ? <a href={c.href}>{c.label}</a> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        ) : null}
        <p className="eyebrow">{kicker}</p>
        <h1 className="display d2" style={{ marginTop: "1rem" }}>
          {title}
        </h1>
        {sub ? (
          <p className="lead" style={{ marginTop: "1.1rem", maxWidth: "60ch" }}>
            {sub}
          </p>
        ) : null}
      </div>
    </section>
  );
}
