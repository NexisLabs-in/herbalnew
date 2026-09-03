"use client";

import { useId, useState, type ReactNode } from "react";

export type AccordionItem = { key: string; title: string; body: ReactNode };

/**
 * Single-open accordion. `grid-template-rows: 0fr -> 1fr` animates the height
 * without measuring, so there is no layout thrash on open.
 */
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState(0);
  const uid = useId().replace(/:/g, "");

  return (
    <ul>
      {items.map((item, i) => {
        const panelId = `${uid}-${item.key}`;
        const isOpen = open === i;
        return (
          <li className="acc__item" key={item.key}>
            <h3>
              <button
                className="acc__btn"
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span className="acc__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="acc__q">{item.title}</span>
                <span className="acc__sign" aria-hidden="true" />
              </button>
            </h3>
            <div className={`acc__panel${isOpen ? " is-open" : ""}`} id={panelId} role="region">
              <div>{item.body}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
