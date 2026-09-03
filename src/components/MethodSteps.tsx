import { METHOD_STEPS } from "@/content/pages";
import { t, type Locale } from "@/lib/i18n";
import { Reveal } from "./Reveal";

export function MethodSteps({ locale }: { locale: Locale }) {
  return (
    <ol className="method">
      <span className="method__line" aria-hidden="true" />
      {METHOD_STEPS.map((step, i) => (
        <Reveal as="li" key={i} className="step" delay={i * 60}>
          <span className="step__dot">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <h3 className="step__t">{t(step.title, locale)}</h3>
            <p className="step__d">{t(step.detail, locale)}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
