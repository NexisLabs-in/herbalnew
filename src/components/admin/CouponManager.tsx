"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductPicker, type PickerProduct } from "./ProductPicker";
import { deleteCoupon, saveCoupon, setCouponActive } from "@/server/actions/marketing";
import type { ActionState } from "@/lib/validation/shared";

export type CouponRow = {
  id: string;
  code: string;
  description: string;
  discountType: "percent" | "amount";
  value: string;
  allProducts: boolean;
  productIds: string[];
  expiresAt: string | null;
  minOrder: string;
  usageLimit: string;
  usageLimitPerCustomer: string;
  usedCount: number;
  active: boolean;
  expired: boolean;
};

type Draft = {
  code: string;
  description: string;
  discountType: "percent" | "amount";
  percentValue: string;
  amountValue: string;
  allProducts: boolean;
  productIds: string[];
  expiresAt: string;
  minOrder: string;
  usageLimit: string;
  usageLimitPerCustomer: string;
  active: boolean;
};

const blank = (): Draft => ({
  code: "",
  description: "",
  discountType: "percent",
  percentValue: "10",
  amountValue: "",
  allProducts: true,
  productIds: [],
  expiresAt: "",
  minOrder: "",
  usageLimit: "",
  usageLimitPerCustomer: "",
  active: true,
});

/** Coupons (requirement C8).
 *
 *  The rule an admin has to understand is stated on the form rather than left
 *  to be discovered: a coupon discounts the whole basket, and is refused
 *  outright if the basket contains anything outside its product list.
 */
export function CouponManager({
  coupons,
  products,
  canWrite,
}: {
  coupons: CouponRow[];
  products: PickerProduct[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const run = (action: () => Promise<ActionState>, close = false) =>
    start(async () => {
      const result = await action();
      setState(result);
      if (result.ok) {
        if (close) setEditing(null);
        router.refresh();
      }
    });

  const startEdit = (coupon: CouponRow) => {
    setEditing(coupon.id);
    setState({});
    setDraft({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      percentValue: coupon.discountType === "percent" ? coupon.value : "10",
      amountValue: coupon.discountType === "amount" ? coupon.value : "",
      allProducts: coupon.allProducts,
      productIds: coupon.productIds,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : "",
      minOrder: coupon.minOrder,
      usageLimit: coupon.usageLimit,
      usageLimitPerCustomer: coupon.usageLimitPerCustomer,
      active: coupon.active,
    });
  };

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
          <h2 className="admin-fieldset__legend">
            {editing === "new" ? "New coupon" : `Edit ${draft.code}`}
          </h2>

          <div className="stack" style={{ ["--stack" as string]: "1.1rem", marginTop: "1.25rem" }}>
            <div className="admin-row">
              <label className="field">
                <span className="field__label">Code</span>
                <input
                  className="field__input"
                  style={{ fontFamily: "var(--font-mono), monospace", textTransform: "uppercase" }}
                  value={draft.code}
                  placeholder="WELCOME10"
                  onChange={(event) => set("code", event.target.value.toUpperCase())}
                />
                {err("code") ? <span className="field__error">{err("code")}</span> : null}
              </label>

              <label className="field">
                <span className="field__label">Discount</span>
                <select
                  className="field__input"
                  value={draft.discountType}
                  onChange={(event) => set("discountType", event.target.value as "percent" | "amount")}
                >
                  <option value="percent">Percentage off</option>
                  <option value="amount">Amount off</option>
                </select>
              </label>

              {draft.discountType === "percent" ? (
                <label className="field">
                  <span className="field__label">Percent</span>
                  <span className="field__wrap">
                    <span className="field__prefix">%</span>
                    <input
                      className="field__input"
                      type="number"
                      min={1}
                      max={100}
                      value={draft.percentValue}
                      onChange={(event) => set("percentValue", event.target.value)}
                    />
                  </span>
                  {err("percentValue") ? <span className="field__error">{err("percentValue")}</span> : null}
                </label>
              ) : (
                <label className="field">
                  <span className="field__label">Amount</span>
                  <span className="field__wrap">
                    <span className="field__prefix">AED</span>
                    <input
                      className="field__input"
                      value={draft.amountValue}
                      placeholder="25.00"
                      onChange={(event) => set("amountValue", event.target.value)}
                    />
                  </span>
                  {err("amountValue") ? <span className="field__error">{err("amountValue")}</span> : null}
                </label>
              )}
            </div>

            <label className="field">
              <span className="field__label">Description</span>
              <input
                className="field__input"
                value={draft.description}
                placeholder="For your own reference"
                onChange={(event) => set("description", event.target.value)}
              />
            </label>

            <div>
              <span className="field__label">Which products</span>
              <p className="field__hint" style={{ marginBottom: ".75rem" }}>
                The code takes its discount off the whole basket — but if the basket contains
                anything not listed here, the code is refused. It is never applied to part of an
                order.
              </p>
              <ProductPicker
                products={products}
                selected={draft.productIds}
                onChange={(ids) => set("productIds", ids)}
                allProducts={draft.allProducts}
                onAllProductsChange={(value) => set("allProducts", value)}
                allLabel="Applies to every product"
              />
              {err("productIds") ? <span className="field__error">{err("productIds")}</span> : null}
            </div>

            <div className="admin-row">
              <label className="field">
                <span className="field__label">Expires</span>
                <input
                  className="field__input"
                  type="date"
                  value={draft.expiresAt}
                  onChange={(event) => set("expiresAt", event.target.value)}
                />
                <span className="field__hint">Leave empty for no expiry.</span>
              </label>

              <label className="field">
                <span className="field__label">Minimum basket</span>
                <span className="field__wrap">
                  <span className="field__prefix">AED</span>
                  <input
                    className="field__input"
                    value={draft.minOrder}
                    onChange={(event) => set("minOrder", event.target.value)}
                  />
                </span>
              </label>
            </div>

            <div className="admin-row">
              <label className="field">
                <span className="field__label">Total uses</span>
                <input
                  className="field__input"
                  type="number"
                  value={draft.usageLimit}
                  placeholder="Unlimited"
                  onChange={(event) => set("usageLimit", event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">Uses per customer</span>
                <input
                  className="field__input"
                  type="number"
                  value={draft.usageLimitPerCustomer}
                  placeholder="Unlimited"
                  onChange={(event) => set("usageLimitPerCustomer", event.target.value)}
                />
              </label>
            </div>

            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => set("active", event.target.checked)}
              />
              <span className="admin-toggle__label">Active</span>
            </label>

            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              <button
                className="btn btn--brand btn--sm"
                type="button"
                disabled={pending}
                onClick={() => run(() => saveCoupon(editing === "new" ? null : editing, draft), true)}
              >
                {pending ? "Saving…" : "Save coupon"}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : canWrite ? (
        <p style={{ marginBottom: "1.25rem" }}>
          <button
            className="btn btn--brand btn--sm"
            type="button"
            onClick={() => {
              setEditing("new");
              setDraft(blank());
              setState({});
            }}
          >
            New coupon
          </button>
        </p>
      ) : null}

      {coupons.length === 0 ? (
        <div className="admin-empty">No coupons yet.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Applies to</th>
                <th>Used</th>
                <th>State</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <span className="admin-table__title admin-table__mono">{coupon.code}</span>
                    {coupon.description ? (
                      <span className="admin-table__meta">{coupon.description}</span>
                    ) : null}
                  </td>
                  <td>
                    {coupon.discountType === "percent" ? `${coupon.value}%` : `AED ${coupon.value}`}
                    {coupon.minOrder ? (
                      <span className="admin-table__meta">over AED {coupon.minOrder}</span>
                    ) : null}
                  </td>
                  <td>
                    {coupon.allProducts ? (
                      <span className="admin-chip">Everything</span>
                    ) : (
                      <span className="admin-chip">{coupon.productIds.length} products</span>
                    )}
                  </td>
                  <td className="admin-table__mono">
                    {coupon.usedCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                  </td>
                  <td>
                    <span
                      className={`admin-chip ${
                        coupon.expired
                          ? "admin-chip--danger"
                          : coupon.active
                            ? "admin-chip--published"
                            : ""
                      }`}
                    >
                      {coupon.expired ? "Expired" : coupon.active ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="admin-table__actions">
                    {canWrite ? (
                      <div className="admin-table__tools">
                        <button className="link-plain" type="button" onClick={() => startEdit(coupon)}>
                          Edit
                        </button>
                        <button
                          className="link-plain"
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setCouponActive(coupon.id, !coupon.active))}
                        >
                          {coupon.active ? "Switch off" : "Switch on"}
                        </button>
                        <button
                          className="link-plain"
                          type="button"
                          disabled={pending || coupon.usedCount > 0}
                          title={
                            coupon.usedCount > 0
                              ? "Switch it off instead, so the orders that used it keep their history"
                              : undefined
                          }
                          onClick={() => run(() => deleteCoupon(coupon.id))}
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
