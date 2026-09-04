import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

/** Signing and verifying session tokens — no cookies, no Node APIs.
 *
 *  Kept apart from `session.ts` because the middleware runs on the Edge runtime
 *  and must be able to verify a token without pulling in `next/headers` or
 *  anything marked `server-only`.
 *
 *  Sessions are stateless JWTs. The middleware cannot reach MongoDB, so a
 *  database-backed session would mean no route protection there at all. What a
 *  token carries is deliberately thin — an id and an email, never permissions:
 *  those are read fresh from the database on every admin request, so narrowing
 *  a role takes effect immediately rather than whenever a token expires.
 *
 *  Customers and admins are signed with **different secrets**, so a leaked
 *  customer key cannot mint an admin session.
 */

export const CUSTOMER_COOKIE = "hb_customer";
export const ADMIN_COOKIE = "hb_admin";

/** A shopper's session outlives a shopping trip; an admin session is worth far
 *  more and expires the same working day. */
export const CUSTOMER_TTL_SECONDS = 60 * 60 * 24 * 30;
export const ADMIN_TTL_SECONDS = 60 * 60 * 12;

export type CustomerSession = { customerId: string; email: string };
export type AdminSession = { adminId: string; email: string };

const customerKey = new TextEncoder().encode(env.AUTH_CUSTOMER_SECRET);
const adminKey = new TextEncoder().encode(env.AUTH_ADMIN_SECRET);

async function sign(payload: Record<string, string>, key: Uint8Array, ttl: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(key);
}

async function read<T>(token: string | undefined, key: Uint8Array): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as T;
  } catch {
    // Expired, tampered with, or signed by the other secret — all the same
    // answer: not logged in.
    return null;
  }
}

export const signCustomerToken = (session: CustomerSession) =>
  sign({ ...session }, customerKey, CUSTOMER_TTL_SECONDS);

export const signAdminToken = (session: AdminSession) =>
  sign({ ...session }, adminKey, ADMIN_TTL_SECONDS);

export const verifyCustomerToken = (token: string | undefined) =>
  read<CustomerSession>(token, customerKey);

export const verifyAdminToken = (token: string | undefined) =>
  read<AdminSession>(token, adminKey);
