"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FULFILLMENT_STATUSES, type FulfillmentStatus } from "@/lib/models/enums";
import { recordRefundNote, resolveCancellation, updateOrderStatus } from "@/server/actions/orders";
import type { ActionState } from "@/lib/validation/shared";

/** The fulfilment controls: a status dropdown, courier and tracking (C3).
 *
 *  Deliberately a manual dropdown rather than a courier integration — that is
 *  what the client asked for. The customer is emailed on every change unless
 *  the admin unticks it, which matters for corrections: fixing a mistyped
 *  status should not send a second "your order is on its way".
 */

const LABEL: Record<FulfillmentStatus, string> = {
  new: "New",
  packed: "Packed",
  dispatched: "Dispatched",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export function OrderFulfilment({
  orderId,
  status,
  courier,
  trackingNumber,
  note,
  paid,
  cancellation,
  refundNote,
}: {
  orderId: string;
  status: FulfillmentStatus;
  courier: string;
  trackingNumber: string;
  note: string;
  paid: boolean;
  cancellation: { status: string; reason: string; adminNote: string } | null;
  refundNote: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});

  const [next, setNext] = useState<FulfillmentStatus>(status);
  const [courierValue, setCourier] = useState(courier);
  const [tracking, setTracking] = useState(trackingNumber);
  const [noteValue, setNote] = useState(note);
  const [notify, setNotify] = useState(true);

  const [decisionNote, setDecisionNote] = useState("");
  const [refund, setRefund] = useState(refundNote);

  const run = (action: () => Promise<ActionState>) =>
    start(async () => {
      const result = await action();
      setState(result);
      if (result.ok) router.refresh();
    });

  return (
    <div className="admin-card">
      <h2 className="admin-fieldset__legend">Fulfilment</h2>

      {state.error ? (
        <p className="auth-card__error" style={{ marginTop: "1rem" }} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="admin-note" style={{ marginTop: "1rem" }} role="status">
          {state.notice}
        </p>
      ) : null}

      {!paid ? (
        <p className="admin-note" style={{ marginTop: "1rem" }}>
          This order has not been paid. It cannot be fulfilled — only cancelled.
        </p>
      ) : null}

      <div className="stack" style={{ ["--stack" as string]: "1rem", marginTop: "1.25rem" }}>
        <label className="field">
          <span className="field__label">Stage</span>
          <select
            className="field__input"
            value={next}
            onChange={(event) => setNext(event.target.value as FulfillmentStatus)}
          >
            {FULFILLMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LABEL[value]}
              </option>
            ))}
          </select>
        </label>

        <div className="admin-row">
          <label className="field">
            <span className="field__label">Courier</span>
            <input
              className="field__input"
              value={courierValue}
              placeholder="Aramex, Emirates Post…"
              onChange={(event) => setCourier(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Tracking number</span>
            <input
              className="field__input"
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Note</span>
          <input
            className="field__input"
            value={noteValue}
            placeholder="Shown to the customer on their order page"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <label className="admin-toggle">
          <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
          <span>
            <span className="admin-toggle__label">Email the customer about this change</span>
            <span className="admin-toggle__hint">
              Untick when correcting a mistake, so they are not told twice.
            </span>
          </span>
        </label>

        <div>
          <button
            className="btn btn--brand btn--sm"
            type="button"
            disabled={pending}
            onClick={() =>
              run(() =>
                updateOrderStatus({
                  orderId,
                  status: next,
                  courier: courierValue,
                  trackingNumber: tracking,
                  note: noteValue,
                  notify,
                }),
              )
            }
          >
            {pending ? "Saving…" : "Update order"}
          </button>
        </div>
      </div>

      {cancellation?.status === "requested" ? (
        <div className="admin-note" style={{ marginTop: "1.5rem" }}>
          <p style={{ margin: 0, fontWeight: 500 }}>The customer asked to cancel this order.</p>
          <p style={{ margin: ".4rem 0 0" }}>{cancellation.reason}</p>

          <label className="field" style={{ marginTop: ".9rem" }}>
            <span className="field__label">Note to the customer</span>
            <input
              className="field__input field__input--sm"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
            />
          </label>

          <div style={{ display: "flex", gap: ".6rem", marginTop: ".75rem", flexWrap: "wrap" }}>
            <button
              className="btn btn--brand btn--sm"
              type="button"
              disabled={pending}
              onClick={() => run(() => resolveCancellation(orderId, "approved", decisionNote))}
            >
              Approve and cancel
            </button>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              disabled={pending}
              onClick={() => run(() => resolveCancellation(orderId, "declined", decisionNote))}
            >
              Decline
            </button>
          </div>
          <p className="field__hint" style={{ marginTop: ".6rem" }}>
            Approving marks the order cancelled. Issue the refund in the Stripe dashboard —
            this does not move money.
          </p>
        </div>
      ) : null}

      {/* Refunds happen in Stripe (plan §3); this is the shop's own record. */}
      <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--color-line)" }}>
        <label className="field">
          <span className="field__label">Refund note</span>
          <input
            className="field__input"
            value={refund}
            placeholder="What was refunded in Stripe, and why"
            onChange={(event) => setRefund(event.target.value)}
          />
          <span className="field__hint">
            Recording a note marks this order refunded here. The refund itself is issued in the
            Stripe dashboard.
          </span>
        </label>
        <button
          className="btn btn--ghost btn--sm"
          type="button"
          style={{ marginTop: ".75rem" }}
          disabled={pending || !refund.trim()}
          onClick={() => run(() => recordRefundNote(orderId, refund))}
        >
          Save refund note
        </button>
      </div>
    </div>
  );
}
