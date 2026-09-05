"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductPicker, type PickerProduct } from "./ProductPicker";
import { deleteSale, saveSale, setSaleActive } from "@/server/actions/marketing";
import type { ActionState } from "@/lib/validation/shared";

export type SaleRow = {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  active: boolean;
  live: boolean;
  entries: { productId: string; discountPercent: number }[];
};

/** Sales (requirement C6): pick products, set a percentage each, set a window.
 *
 *  A sale is never written onto the products themselves — the pricing engine
 *  resolves it live from the dates, so a sale starts and ends on its own with
 *  nothing running at midnight to make prices correct.
 */
export function SaleManager({
  sales,
  products,
  canWrite,
}: {
  sales: SaleRow[];
  products: PickerProduct[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [percent, setPercent] = useState("20");
  const [selected, setSelected] = useState<string[]>([]);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const run = (action: () => Promise<ActionState>, close = false) =>
    start(async () => {
      const result = await action();
      setState(result);
      if (result.ok) {
        if (close) setEditing(null);
        router.refresh();
      }
    });

  const startNew = () => {
    const now = new Date();
    const later = new Date(Date.now() + 7 * 86_400_000);
    setEditing("new");
    setName("");
    setStartAt(now.toISOString().slice(0, 16));
    setEndAt(later.toISOString().slice(0, 16));
    setPercent("20");
    setSelected([]);
    setState({});
  };

  const startEdit = (sale: SaleRow) => {
    setEditing(sale.id);
    setName(sale.name);
    setStartAt(sale.startAt.slice(0, 16));
    setEndAt(sale.endAt.slice(0, 16));
    setPercent(String(sale.entries[0]?.discountPercent ?? 20));
    setSelected(sale.entries.map((entry) => entry.productId));
    setState({});
  };

  const save = () =>
    run(
      () =>
        saveSale(editing === "new" ? null : editing, {
          name,
          startAt,
          endAt,
          active: true,
          entries: selected.map((productId) => ({ productId, discountPercent: percent })),
        }),
      true,
    );

  const err = (path: string) => state.fieldErrors?.[path];

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

      {editing ? (
        <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="admin-fieldset__legend">{editing === "new" ? "New sale" : "Edit sale"}</h2>

          <div className="stack" style={{ ["--stack" as string]: "1.1rem", marginTop: "1.25rem" }}>
            <label className="field">
              <span className="field__label">Name</span>
              <input
                className="field__input"
                value={name}
                placeholder="Ramadan offer"
                onChange={(event) => setName(event.target.value)}
              />
              {err("name") ? <span className="field__error">{err("name")}</span> : null}
            </label>

            <div className="admin-row">
              <label className="field">
                <span className="field__label">Starts</span>
                <input
                  className="field__input"
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
                {err("startAt") ? <span className="field__error">{err("startAt")}</span> : null}
              </label>
              <label className="field">
                <span className="field__label">Ends</span>
                <input
                  className="field__input"
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                />
                {err("endAt") ? <span className="field__error">{err("endAt")}</span> : null}
              </label>
            </div>

            <label className="field" style={{ maxWidth: "220px" }}>
              <span className="field__label">Discount</span>
              <span className="field__wrap">
                <span className="field__prefix">%</span>
                <input
                  className="field__input"
                  type="number"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={(event) => setPercent(event.target.value)}
                />
              </span>
              <span className="field__hint">
                Applied to every product in this sale. A product with a bigger standing discount
                keeps that one instead — they never stack.
              </span>
            </label>

            <div>
              <span className="field__label">Products</span>
              <ProductPicker products={products} selected={selected} onChange={setSelected} />
              {err("entries") ? <span className="field__error">{err("entries")}</span> : null}
            </div>

            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              <button className="btn btn--brand btn--sm" type="button" disabled={pending} onClick={save}>
                {pending ? "Saving…" : "Save sale"}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : canWrite ? (
        <p style={{ marginBottom: "1.25rem" }}>
          <button className="btn btn--brand btn--sm" type="button" onClick={startNew}>
            Start a sale
          </button>
        </p>
      ) : null}

      {sales.length === 0 ? (
        <div className="admin-empty">No sales yet.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sale</th>
                <th>Window</th>
                <th>Products</th>
                <th>State</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <span className="admin-table__title">{sale.name}</span>
                    <span className="admin-table__meta">
                      {sale.entries[0]?.discountPercent ?? 0}% off
                    </span>
                  </td>
                  <td className="admin-table__meta">
                    {new Date(sale.startAt).toLocaleDateString("en-AE")} →{" "}
                    {new Date(sale.endAt).toLocaleDateString("en-AE")}
                  </td>
                  <td>{sale.entries.length}</td>
                  <td>
                    {/* Live means switched on *and* inside its window — the two
                        are different states and an admin needs to see which. */}
                    <span
                      className={`admin-chip ${
                        sale.live ? "admin-chip--published" : sale.active ? "admin-chip--warn" : ""
                      }`}
                    >
                      {sale.live ? "Live" : sale.active ? "Scheduled" : "Paused"}
                    </span>
                  </td>
                  <td className="admin-table__actions">
                    {canWrite ? (
                      <div className="admin-table__tools">
                        <button className="link-plain" type="button" onClick={() => startEdit(sale)}>
                          Edit
                        </button>
                        <button
                          className="link-plain"
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setSaleActive(sale.id, !sale.active))}
                        >
                          {sale.active ? "Pause" : "Resume"}
                        </button>
                        <button
                          className="link-plain"
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => deleteSale(sale.id))}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
