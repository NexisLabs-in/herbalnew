"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stars } from "@/components/Stars";
import { deleteReview, moderateReview, setReviewModeration } from "@/server/actions/reviews";
import type { ActionState } from "@/lib/validation/shared";

export type AdminReview = {
  id: string;
  productName: string;
  productId: string;
  author: string;
  email: string;
  rating: number;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

/** The moderation queue, and the switch that decides whether there is one (C2). */
export function ReviewQueue({
  reviews,
  moderationEnabled,
  canModerate,
  canChangeSetting,
}: {
  reviews: AdminReview[];
  moderationEnabled: boolean;
  canModerate: boolean;
  canChangeSetting: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const [enabled, setEnabled] = useState(moderationEnabled);

  const run = (action: () => Promise<ActionState>) =>
    start(async () => {
      const result = await action();
      setState(result);
      if (result.ok) router.refresh();
    });

  return (
    <>
      <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
        <label className="admin-toggle">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canChangeSetting || pending}
            onChange={(event) => {
              const next = event.target.checked;
              setEnabled(next);
              run(() => setReviewModeration(next));
            }}
          />
          <span>
            <span className="admin-toggle__label">Approve reviews before they appear</span>
            <span className="admin-toggle__hint">
              {enabled
                ? "New reviews wait here until you publish them."
                : "New reviews go straight onto the product page."}{" "}
              Changing this affects new reviews only — nothing already published is withdrawn.
            </span>
          </span>
        </label>
      </div>

      {state.error ? (
        <p className="auth-card__error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="admin-note" role="status" style={{ marginBottom: "1.25rem" }}>
          {state.notice}
        </p>
      ) : null}

      {reviews.length === 0 ? (
        <div className="admin-empty">No reviews yet.</div>
      ) : (
        <div className="cart-lines">
          {reviews.map((review) => (
            <article className="admin-card" key={review.id}>
              <div className="admin-review__head">
                <div>
                  <span style={{ color: "var(--color-violet-600)" }}>
                    <Stars rating={review.rating} />
                  </span>
                  <p className="admin-table__title" style={{ marginTop: ".4rem" }}>
                    {review.title || "—"}
                  </p>
                  <p className="admin-table__meta">
                    {review.productName} · {review.author || "no name"} ({review.email}) ·{" "}
                    {new Date(review.createdAt).toLocaleDateString("en-AE")}
                  </p>
                </div>
                <span
                  className={`admin-chip ${
                    review.status === "approved"
                      ? "admin-chip--published"
                      : review.status === "pending"
                        ? "admin-chip--warn"
                        : "admin-chip--danger"
                  }`}
                >
                  {review.status}
                </span>
              </div>

              <p style={{ marginTop: ".8rem", whiteSpace: "pre-line" }}>{review.body}</p>

              {canModerate ? (
                <div className="admin-table__tools" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
                  {review.status !== "approved" ? (
                    <button
                      className="link-plain"
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => moderateReview(review.id, "approved"))}
                    >
                      Publish
                    </button>
                  ) : null}
                  {review.status !== "rejected" ? (
                    <button
                      className="link-plain"
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => moderateReview(review.id, "rejected"))}
                    >
                      Reject
                    </button>
                  ) : null}
                  <button
                    className="link-plain"
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => deleteReview(review.id))}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
