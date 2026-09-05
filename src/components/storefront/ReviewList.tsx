import { REVIEWS } from "@/content/reviews";
import { Stars } from "@/components/Stars";
import type { ReviewSummary, ReviewView } from "@/lib/reviews";
import { t, type Locale } from "@/lib/i18n";

/** The public reviews on a product page. */
export function ReviewList({
  reviews,
  summary,
  locale,
}: {
  reviews: ReviewView[];
  summary: ReviewSummary;
  locale: Locale;
}) {
  if (summary.count === 0) {
    return (
      <div>
        <p className="display d4">{t(REVIEWS.none, locale)}</p>
        <p className="body" style={{ marginTop: ".6rem" }}>
          {t(REVIEWS.noneHint, locale)}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="review-summary">
        <div>
          <span className="display d3">{summary.average}</span>
          <span className="review-summary__outof"> {t(REVIEWS.outOf, locale)}</span>
          <div style={{ marginTop: ".3rem", color: "var(--color-violet-600)" }}>
            <Stars rating={summary.average} size={18} />
          </div>
          <p className="review-summary__count">
            {summary.count === 1
              ? t(REVIEWS.oneReview, locale)
              : `${summary.count} ${t(REVIEWS.manyReviews, locale)}`}
          </p>
        </div>

        {/* The distribution matters more than the average: four 5s and one 1
            is a different product from five 4s, and the bars show that. */}
        <div className="review-bars">
          {summary.distribution.map((count, index) => {
            const star = 5 - index;
            const share = summary.count === 0 ? 0 : (count / summary.count) * 100;
            return (
              <div className="review-bar" key={star}>
                <span className="review-bar__star">{star}</span>
                <span className="review-bar__track">
                  <span className="review-bar__fill" style={{ width: `${share}%` }} />
                </span>
                <span className="review-bar__count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="review-list">
        {reviews.map((review) => (
          <li key={review.id}>
            <div style={{ color: "var(--color-violet-600)" }}>
              <Stars rating={review.rating} />
            </div>
            {review.title ? <h3 className="review-list__title">{review.title}</h3> : null}
            <p className="review-list__body">{review.body}</p>
            <p className="review-list__meta">
              {review.authorName} · {t(REVIEWS.verified, locale)}
              {review.publishedAt
                ? ` · ${new Date(review.publishedAt).toLocaleDateString(
                    locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE",
                    { day: "numeric", month: "short", year: "numeric" },
                  )}`
                : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
