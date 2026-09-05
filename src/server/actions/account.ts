"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCustomer } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Customer, type AddressDoc } from "@/lib/models/Customer";
import { Product } from "@/lib/models/Product";
import { addressSchema } from "@/lib/validation/checkout";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";

/** The customer's own account: profile, addresses, wishlist.
 *
 *  Everything here is scoped to the signed-in customer by the query itself —
 *  an id in a request body is never trusted to identify whose record to edit.
 */

const profileSchema = z.object({
  name: z.string().trim().max(120).default(""),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value === "" || /^[0-9+()\s-]{7,}$/.test(value), {
      message: "Digits, spaces and + only.",
    })
    .default(""),
});

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in again." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { error: "Check the details.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await connectDb();
  // The email is not editable here. It is the login identity (C5), and changing
  // it would need the new address verified by code before the old one stops
  // working — otherwise a typo locks the customer out of their own account.
  await Customer.updateOne({ _id: customer._id }, { $set: parsed.data });

  revalidatePath("/[locale]/account", "page");
  revalidatePath("/[locale]/account/profile", "page");
  return { ok: true, notice: "Saved." };
}

export async function upsertAddress(
  addressId: string | null,
  payload: unknown,
): Promise<ActionState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in again." };

  const parsed = addressSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Check the address.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await connectDb();
  const record = await Customer.findById(customer._id);
  if (!record) return { error: "Please sign in again." };

  // The first address saved is the default whether or not the box was ticked,
  // so checkout always has something preselected.
  const makeDefault = parsed.data.isDefault || record.addresses.length === 0;

  if (addressId) {
    const existing = record.addresses.find(
      (address: AddressDoc) => String(address._id) === addressId,
    );
    if (!existing) return { error: "That address is no longer on your account." };
    if (makeDefault) for (const address of record.addresses) address.isDefault = false;
    existing.set({ ...parsed.data, isDefault: makeDefault, country: "AE" });
  } else {
    if (makeDefault) for (const address of record.addresses) address.isDefault = false;
    record.addresses.push({ ...parsed.data, isDefault: makeDefault, country: "AE" });
  }

  if (!record.name) record.name = parsed.data.fullName;
  await record.save();

  revalidatePath("/[locale]/account/addresses", "page");
  return { ok: true, notice: "Address saved." };
}

export async function removeAddress(addressId: string): Promise<ActionState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in again." };

  await connectDb();
  const record = await Customer.findById(customer._id);
  if (!record) return { error: "Please sign in again." };

  const removed = record.addresses.find((address: AddressDoc) => String(address._id) === addressId);
  record.set(
    "addresses",
    record.addresses.filter((address: AddressDoc) => String(address._id) !== addressId),
  );

  // Never leave a customer with addresses but no default.
  if (removed?.isDefault && record.addresses.length > 0) record.addresses[0].isDefault = true;

  await record.save();
  revalidatePath("/[locale]/account/addresses", "page");
  return { ok: true, notice: "Address removed." };
}

export async function setDefaultAddress(addressId: string): Promise<ActionState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in again." };

  await connectDb();
  const record = await Customer.findById(customer._id);
  if (!record) return { error: "Please sign in again." };

  let found = false;
  for (const address of record.addresses) {
    const isMatch = String(address._id) === addressId;
    address.isDefault = isMatch;
    if (isMatch) found = true;
  }
  if (!found) return { error: "That address is no longer on your account." };

  await record.save();
  revalidatePath("/[locale]/account/addresses", "page");
  return { ok: true };
}

// --- Wishlist ----------------------------------------------------------------

/** One action for both directions.
 *
 *  A separate add and remove would need the client to know the current state,
 *  and it is stale the moment two tabs are open. Toggling server-side and
 *  returning the new state means the button always reflects the database.
 */
export async function toggleWishlist(productId: string): Promise<ActionState & { saved?: boolean }> {
  const customer = await getCustomer();
  if (!customer) return { error: "sign_in" };

  if (!/^[0-9a-f]{24}$/i.test(productId)) return { error: "That product could not be found." };

  await connectDb();
  const record = await Customer.findById(customer._id);
  if (!record) return { error: "sign_in" };

  const product = await Product.findOne({ _id: productId, status: "published" }).select("_id").lean();
  if (!product) return { error: "That product is no longer available." };

  const already = record.wishlist.some((id: unknown) => String(id) === productId);

  if (already) {
    record.set(
      "wishlist",
      record.wishlist.filter((id: unknown) => String(id) !== productId),
    );
  } else {
    record.wishlist.push(product._id);
  }

  await record.save();
  revalidatePath("/[locale]/account/wishlist", "page");

  return { ok: true, saved: !already };
}
