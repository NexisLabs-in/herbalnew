import { TRADITIONS } from "@/content/brand";
import { t, type Locale } from "@/lib/i18n";
import { Icon } from "./Icon";

/** Marquee of the five schools. Duplicated once so the loop is seamless; the
 *  copy is aria-hidden so screen readers hear each school a single time. */
export function TraditionsRibbon({ locale }: { locale: Locale }) {
  const run = (hidden: boolean) =>
    TRADITIONS.map((tradition, i) => (
      <span key={`${hidden ? "b" : "a"}-${i}`} style={{ display: "contents" }}>
        <span className="tradition">
          <span className="tradition__mark">
            <Icon name="leaf" size={26} />
          </span>
          <span className="tradition__name">{t(tradition, locale)}</span>
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
