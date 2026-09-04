"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "@/server/actions/inventory";

/** A relative stock correction with a reason.
 *
 *  Relative rather than absolute so two people counting the same shelf add up
 *  instead of overwriting each other, and the reason is required because an
 *  unexplained stock change is the one nobody can reconstruct later.
 */
export function StockAdjuster({ productId, stock }: { productId: string; stock: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      const result = await adjustStock({ productId, delta, reason });
      if (result.error) {
        setError(result.error ?? Object.values(result.fieldErrors ?? {})[0] ?? "Could not adjust.");
        return;
      }
      setOpen(false);
      setDelta("");
      setReason("");
      router.refresh();
    });

  if (!open) {
    return (
      <button className="link-plain" type="button" onClick={() => setOpen(true)}>
        Adjust
      </button>
    );
  }

  const parsed = Number(delta);
  const preview = Number.isFinite(parsed) && delta !== "" ? stock + parsed : null;

  return (
    <div className="admin-adjust">
      <div className="admin-adjust__row">
        <input
          className="field__input field__input--sm"
          style={{ width: "86px" }}
          value={delta}
          placeholder="+10 / -2"
          inputMode="numeric"
          aria-label="Change in units"
          onChange={(event) => setDelta(event.target.value)}
        />
        <input
          className="field__input field__input--sm"
          value={reason}
          placeholder="Reason — delivery, stock count, breakage"
          aria-label="Reason"
          onChange={(event) => setReason(event.target.value)}
        />
        <button className="btn btn--brand btn--sm" type="button" disabled={pending} onClick={submit}>
          {pending ? "…" : "Apply"}
        </button>
        <button className="link-plain" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {preview !== null && preview >= 0 ? (
        <p className="field__hint">
          {stock} → {preview}
        </p>
      ) : null}
      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}
