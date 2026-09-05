"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFeatured } from "@/server/actions/marketing";
import type { ActionState } from "@/lib/validation/shared";

export type FeaturedProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  featured: boolean;
  order: number;
};

/** The homepage featured section (requirement C10).
 *
 *  Order matters, so the chosen products are a reorderable list rather than
 *  scattered checkboxes — where something sits on the homepage is the whole
 *  point of choosing it.
 */
export function FeaturedManager({
  products,
  canWrite,
}: {
  products: FeaturedProduct[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>(
    products
      .filter((product) => product.featured)
      .sort((a, b) => a.order - b.order)
      .map((product) => product.id),
  );
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const byId = new Map(products.map((product) => [product.id, product]));
  const available = products.filter((product) => !chosen.includes(product.id));

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= chosen.length) return;
    const copy = [...chosen];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setChosen(copy);
  };

  const save = () =>
    start(async () => {
      const result = await saveFeatured({
        entries: chosen.map((productId, index) => ({ productId, order: index })),
      });
      setState(result);
      if (result.ok) router.refresh();
    });

  return (
    <>
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

      <div className="admin-order">
        <div className="admin-card">
          <h2 className="admin-fieldset__legend">On the homepage</h2>
          <p className="admin-fieldset__hint">Top of this list is first on the page.</p>

          {chosen.length === 0 ? (
            <p className="admin-stat__note" style={{ marginTop: "1rem" }}>
              Nothing featured. The homepage section is hidden until something is chosen.
            </p>
          ) : (
            <div style={{ marginTop: "1rem" }}>
              {chosen.map((id, index) => {
                const product = byId.get(id);
                if (!product) return null;
                return (
                  <div className="admin-list__row" key={id}>
                    <div className="admin-list__inputs">
                      <span className="admin-table__title">{product.name}</span>
                      <span className="admin-table__meta">
                        {product.sku} · {product.category}
                      </span>
                    </div>
                    <div className="admin-list__tools">
                      <button
                        type="button"
                        className="admin-icon-btn"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn"
                        aria-label="Move down"
                        disabled={index === chosen.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Remove"
                        onClick={() => setChosen(chosen.filter((value) => value !== id))}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canWrite ? (
            <button
              className="btn btn--brand btn--sm"
              type="button"
              style={{ marginTop: "1rem" }}
              disabled={pending}
              onClick={save}
            >
              {pending ? "Saving…" : "Save homepage"}
            </button>
          ) : null}
        </div>

        <div className="admin-card">
          <h2 className="admin-fieldset__legend">Available</h2>
          <p className="admin-fieldset__hint">Published products only.</p>

          {available.length === 0 ? (
            <p className="admin-stat__note" style={{ marginTop: "1rem" }}>
              Everything published is already featured.
            </p>
          ) : (
            <div className="picker__list" style={{ marginTop: "1rem" }}>
              {available.map((product) => (
                <button
                  className="picker__row"
                  type="button"
                  key={product.id}
                  style={{ width: "100%", textAlign: "start", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => setChosen([...chosen, product.id])}
                >
                  <span>+</span>
                  <span>
                    {product.name}
                    <span className="admin-table__meta">
                      {product.sku} · {product.category}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
