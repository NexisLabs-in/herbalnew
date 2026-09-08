import { METHOD_STEPS } from "@/content/pages";
import { tl, type Locale, type TL } from "@/lib/i18n";
import { Reveal } from "./Reveal";

export function MethodSteps({
  locale,
  steps,
}: {
  locale: Locale;
  steps?: { title: TL; detail: TL }[];
}) {
  const items = steps ?? METHOD_STEPS;
  return (
    <ol className="method">
      <span className="method__line" aria-hidden="true" />
      {items.map((step, i) => (
        <Reveal as="li" key={i} className="step" delay={i * 60}>
          <span className="step__dot">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <h3 className="step__t">{tl(step.title, locale)}</h3>
            <p className="step__d">{tl(step.detail, locale)}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
