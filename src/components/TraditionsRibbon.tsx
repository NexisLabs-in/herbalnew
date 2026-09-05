import { TRADITIONS } from "@/content/brand";
import { t, tl, type L, type Locale, type TL } from "@/lib/i18n";
import { Icon } from "./Icon";

/** Marquee of the five schools. Duplicated once so the loop is seamless; the
 *  copy is aria-hidden so screen readers hear each school a single time. */
export function TraditionsRibbon({
  locale,
  items,
}: {
  locale: Locale;
  /** Supplied by the CMS. Falls back to the built-in list so the component
   *  still works on the pages that have not been moved into the CMS. */
  items?: TL[];
}) {
  const traditions: (L | TL)[] = items && items.length > 0 ? items : TRADITIONS;

  const run = (hidden: boolean) =>
    traditions.map((tradition, i) => (
      <span key={`${hidden ? "b" : "a"}-${i}`} style={{ display: "contents" }}>
        <span className="tradition">
          <span className="tradition__mark">
            <Icon name="leaf" size={26} />
          </span>
          <span className="tradition__name">{tl(tradition as TL, locale)}</span>
        </span>
        <span className="tradition__sep" aria-hidden="true" />
      </span>
    ));

  return (
    <div className="traditions">
      <div className="traditions__row">
        <span style={{ display: "contents" }}>{run(false)}</span>
        <span className="traditions__dupe" aria-hidden="true">
          {run(true)}
        </span>
      </div>
    </div>
  );
}
