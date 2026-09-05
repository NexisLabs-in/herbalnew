"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeEnquiry, sendQuote } from "@/server/actions/enquiries";
import type { ActionState } from "@/lib/validation/shared";

export type AdminEnquiry = {
  id: string;
  productName: string;
  productSku: string;
  name: string;
  email: string;
  phone: string;
  qty: number;
  message: string;
  status: string;
  locale: string;
  quotedPrice: string;
  quoteExpiresAt: string | null;
  orderNumber: string | null;
  createdAt: string;
};

/** Answering a price request (C1).
 *
 *  Quoting is the whole job here, so the form is inline on the row rather than
 *  behind a page transition — an admin working through a morning's enquiries
 *  should not lose their place to answer one.
 */
export function EnquiryList({
  enquiries,
  canWrite,
}: {
  enquiries: AdminEnquiry[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("14");
  const [note, setNote] = useState("");
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const run = (action: () => Promise<ActionState>, close = false) =>
    start(async () => {
      const result = await action();
      setState(result);
      if (result.ok) {
        if (close) setOpen(null);
        router.refresh();
      }
    });

  if (enquiries.length === 0) return <div className="admin-empty">No price enquiries yet.</div>;

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

      <div className="cart-lines">
        {enquiries.map((enquiry) => (
          <article className="admin-card" key={enquiry.id}>
            <div className="admin-review__head">
              <div>
                <p className="admin-table__title">{enquiry.productName}</p>
                <p className="admin-table__meta">
                  {enquiry.name} · {enquiry.email}
                  {enquiry.phone ? ` · ${enquiry.phone}` : ""} · {enquiry.qty} wanted ·{" "}
                  {new Date(enquiry.createdAt).toLocaleDateString("en-AE")}
                </p>
              </div>
              <span
                className={`admin-chip ${
                  enquiry.status === "new"
                    ? "admin-chip--warn"
                    : enquiry.status === "accepted"
                      ? "admin-chip--published"
                      : ""
                }`}
              >
                {enquiry.status}
              </span>
            </div>

            {enquiry.message ? (
              <p style={{ marginTop: ".7rem", whiteSpace: "pre-line" }}>{enquiry.message}</p>
            ) : null}

            {enquiry.quotedPrice ? (
              <p className="admin-stat__note" style={{ marginTop: ".7rem" }}>
                Quoted {enquiry.quotedPrice} each
                {enquiry.quoteExpiresAt
                  ? ` · valid until ${new Date(enquiry.quoteExpiresAt).toLocaleDateString("en-AE")}`
                  : ""}
                {enquiry.orderNumber ? ` · paid as ${enquiry.orderNumber}` : ""}
              </p>
            ) : null}

            {canWrite && enquiry.status !== "accepted" && enquiry.status !== "closed" ? (
              open === enquiry.id ? (
                <div className="stack" style={{ ["--stack" as string]: ".9rem", marginTop: "1rem" }}>
                  <div className="admin-row">
                    <label className="field">
                      <span className="field__label">Price each</span>
                      <span className="field__wrap">
                        <span className="field__prefix">AED</span>
                        <input
                          className="field__input"
                          value={price}
                          placeholder="0.00"
                          onChange={(event) => setPrice(event.target.value)}
                        />
                      </span>
                    </label>
                    <label className="field">
                      <span className="field__label">Valid for (days)</span>
                      <input
                        className="field__input"
                        type="number"
                        min={1}
                        max={90}
                        value={days}
                        onChange={(event) => setDays(event.target.value)}
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span className="field__label">Note to the customer</span>
                    <textarea
                      className="field__input"
                      rows={2}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </label>

                  <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
                    <button
                      className="btn btn--brand btn--sm"
                      type="button"
                      disabled={pending || !price.trim()}
                      onClick={() =>
                        run(
                          () =>
                            sendQuote({
                              enquiryId: enquiry.id,
                              unitPrice: price,
                              validForDays: days,
                              note,
                            }),
                          true,
                        )
                      }
                    >
                      {pending ? "Sending…" : "Send quote"}
                    </button>
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => setOpen(null)}>
                      Cancel
                    </button>
                  </div>
                  <p className="field__hint">
                    Sends the customer a single-use link at this price. Shipping and tax are added
                    at checkout.
                  </p>
                </div>
              ) : (
                <div className="admin-table__tools" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
                  <button
                    className="link-plain"
                    type="button"
                    onClick={() => {
                      setOpen(enquiry.id);
                      setPrice("");
                      setDays("14");
                      setNote("");
                      setState({});
                    }}
                  >
                    {enquiry.status === "quoted" ? "Re-quote" : "Send a quote"}
                  </button>
                  <button
                    className="link-plain"
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => closeEnquiry(enquiry.id))}
                  >
                    Close
                  </button>
                </div>
              )
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
