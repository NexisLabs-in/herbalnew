import "server-only";
import { cookies } from "next/headers";
import { env } from "../env";
import {
  ADMIN_COOKIE,
  ADMIN_TTL_SECONDS,
  CUSTOMER_COOKIE,
  CUSTOMER_TTL_SECONDS,
  signAdminToken,
  signCustomerToken,
  verifyAdminToken,
  verifyCustomerToken,
  type AdminSession,
  type CustomerSession,
} from "./tokens";

/** Reading and writing session cookies. The signing itself lives in `tokens.ts`
 *  so the Edge middleware can verify without touching `next/headers`. */

export type { AdminSession, CustomerSession };
export { ADMIN_COOKIE, CUSTOMER_COOKIE };

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  // Lax rather than strict: a customer following an order link from their email
  // should arrive already logged in.
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export async function createCustomerSession(session: CustomerSession): Promise<void> {
  const token = await signCustomerToken(session);
  (await cookies()).set(CUSTOMER_COOKIE, token, cookieOptions(CUSTOMER_TTL_SECONDS));
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  return verifyCustomerToken((await cookies()).get(CUSTOMER_COOKIE)?.value);
}

export async function clearCustomerSession(): Promise<void> {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function createAdminSession(session: AdminSession): Promise<void> {
  const token = await signAdminToken(session);
  (await cookies()).set(ADMIN_COOKIE, token, cookieOptions(ADMIN_TTL_SECONDS));
}

export async function getAdminSession(): Promise<AdminSession | null> {
  return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
