"use client";

import { useState, type ReactNode } from "react";

export type FilterOption = { value: string; label: string };

export type FilterShelf = {
  id: string;
  header: ReactNode;
  products: { key: string; form: string; node: ReactNode }[];
};

/**
 * Filters formulas client-side. The cards themselves are rendered on the server
 * and passed in — this component only decides what stays visible, and drops a
 * shelf entirely once nothing on it matches.
 */
export function ShopFilters({
  options,
  shelves,
}: {
  options: FilterOption[];
  shelves: FilterShelf[];
}) {
  const [active, setActive] = useState(options[0]?.value ?? "all");
  const matches = (form: string) => active === "all" || form === active;

  return (
    <>
      <div className="filters">
        {options.map((option) => (
          <button
            key={option.value}
            className={`filter${option.value === active ? " is-active" : ""}`}
            type="button"
            aria-pressed={option.value === active}
            onClick={() => setActive(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {shelves.map((shelf) => {
        const visible = shelf.products.filter((p) => matches(p.form));
        if (visible.length === 0) return null;
        return (
          <section key={shelf.id} className="shelf" style={{ marginTop: "clamp(2.5rem,5vw,4rem)" }}>
            <div className="shelf__head">{shelf.header}</div>
            <div className="product-grid">
              {visible.map((p) => (
                <div key={p.key} style={{ display: "contents" }}>
                  {p.node}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
