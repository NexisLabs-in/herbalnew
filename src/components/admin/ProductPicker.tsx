"use client";

import { useMemo, useState } from "react";

export type PickerProduct = { id: string; name: string; sku: string; category: string };

/** Choosing products from the catalogue.
 *
 *  Used by sales, coupons and the featured list. A searchable checkbox list
 *  rather than a multi-select: a native multi-select on a phone is close to
 *  unusable, and "select all" has to be one click for the coupon rule (C8) to
 *  be practical.
 */
export function ProductPicker({
  products,
  selected,
  onChange,
  allProducts,
  onAllProductsChange,
  allLabel = "Applies to every product",
}: {
  products: PickerProduct[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** When provided, renders the select-all shortcut as its own switch. */
  allProducts?: boolean;
  onAllProductsChange?: (value: boolean) => void;
  allLabel?: string;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term),
    );
  }, [products, query]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  const disabled = allProducts === true;

  return (
    <div>
      {onAllProductsChange ? (
        <label className="admin-toggle" style={{ marginBottom: "1rem" }}>
          <input
            type="checkbox"
            checked={allProducts}
            onChange={(event) => onAllProductsChange(event.target.checked)}
          />
          <span>
            <span className="admin-toggle__label">{allLabel}</span>
            <span className="admin-toggle__hint">
              Stored as a rule, not a list — products added later are covered automatically.
            </span>
          </span>
        </label>
      ) : null}

      <div className={disabled ? "picker is-disabled" : "picker"}>
        <div className="picker__head">
          <input
            className="field__input field__input--sm"
            type="search"
            value={query}
            placeholder="Search products"
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="picker__count">{selected.length} selected</span>
          {!disabled ? (
            <>
              <button
                className="link-plain"
                type="button"
                onClick={() => onChange(visible.map((product) => product.id))}
              >
                Select all
              </button>
              <button className="link-plain" type="button" onClick={() => onChange([])}>
                Clear
              </button>
            </>
          ) : null}
        </div>

        <div className="picker__list">
          {visible.length === 0 ? (
            <p className="admin-stat__note" style={{ padding: ".75rem" }}>
              No products match.
            </p>
          ) : (
            visible.map((product) => (
              <label className="picker__row" key={product.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(product.id)}
                  disabled={disabled}
                  onChange={() => toggle(product.id)}
                />
                <span>
                  {product.name}
                  <span className="admin-table__meta">
                    {product.sku} · {product.category}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
