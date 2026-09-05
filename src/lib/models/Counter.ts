import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./base";

/** Atomic sequence numbers for orders and invoices.
 *
 *  Order numbers are customer-facing and must never repeat or collide, so they
 *  cannot be derived from a count of existing documents — two checkouts a
 *  millisecond apart would read the same count and mint the same number. A
 *  single-document `$inc` is atomic at the database, which is the only place
 *  that guarantee can live.
 *
 *  Sequences reset per year (`orders:2026`), so numbers stay short and readable
 *  rather than growing forever.
 */
const counterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export type CounterDoc = InferSchemaType<typeof counterSchema>;
export const Counter = defineModel("Counter", counterSchema);

/** Returns the next number in a sequence. Creates the sequence on first use. */
export async function nextInSequence(key: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return counter!.value;
}

/** `HB-2026-0001`. The year makes a number self-dating in a support
 *  conversation, and the padding keeps them the same width for the first ten
 *  thousand orders of a year. */
export async function nextOrderNumber(prefix = "HB"): Promise<string> {
  const year = new Date().getFullYear();
  const value = await nextInSequence(`orders:${year}`);
  return `${prefix}-${year}-${String(value).padStart(4, "0")}`;
}

/** `INV-2026-0001`. Invoices are numbered separately from orders: an
 *  unpaid order never gets an invoice number, so the two sequences would
 *  otherwise drift apart and look like missing records to an accountant. */
export async function nextInvoiceNumber(prefix = "INV"): Promise<string> {
  const year = new Date().getFullYear();
  const value = await nextInSequence(`invoices:${year}`);
  return `${prefix}-${year}-${String(value).padStart(4, "0")}`;
}
