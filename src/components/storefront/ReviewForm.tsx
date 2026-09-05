"use client";

import { useActionState, useState } from "react";
import { REVIEWS } from "@/content/reviews";
import { submitReview, type ReviewState } from "@/server/actions/reviews";
import { t, type Locale } from "@/lib/i18n";

/** Writing a review.
 *
 *  Only rendered for customers who can actually write one — a verified buyer
 *  with a delivered order (C2). Everyone else never sees the form, rather than
 *  seeing it and being refused on submit.
 */
export function ReviewForm({ productId, locale }: { productId: string; locale: Locale }) {
  const [state, submit, pending] = useActionState<ReviewState, FormData>(submitReview, {});
  const [rating, setRating] = useState(5);

  if (state.ok) {
    return (
      <p className="admin-note" role="status">
        {state.moderated ? t(REVIEWS.submittedModerated, locale) : t(REVIEWS.submittedLive, locale)}
      </p>
    );
  }

  return (
    <form action={submit} className="review-form">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <p className="eyebrow eyebrow--plain">{t(REVIEWS.writeTitle, locale)}</p>

      {state.error ? (
        <p className="auth-card__error" style={{ marginTop: ".9rem" }} role="alert">
          {state.error}
        </p>
      ) : null}

      <fieldset className="rating-input">
        <legend className="field__label">{t(REVIEWS.yourRating, locale)}</legend>
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className={star <= rating ? "is-on" : undefined}>
            <input
              type="radio"
              name="ratingChoice"
              value={star}
              checked={rating === star}
              onChange={() => setRating(star)}
            />
            <span aria-hidden="true">★</span>
            <span className="visually-hidden">{star}</span>
          </label>
        ))}
      </fieldset>

      <label className="field">
        <span className="field__label">{t(REVIEWS.title, locale)}</span>
        <input className="field__input" name="title" maxLength={120} />
      </label>

      <label className="field">
        <span className="field__label">{t(REVIEWS.body, locale)}</span>
        <textarea className="field__input" name="body" rows={4} required minLength={10} />
      </label>

      <button className="btn btn--brand" type="submit" disabled={pending}>
        {pending ? t(REVIEWS.sending, locale) : t(REVIEWS.submit, locale)}
      </button>
    </form>
  );
}
