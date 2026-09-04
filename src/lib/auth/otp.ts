import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDb } from "../db";
import { OtpToken, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES, type OtpPurpose } from "../models/OtpToken";

/** One-time codes: customer login (C5) and admin password reset.
 *
 *  Rules, and why:
 *   - **Six digits, hashed at rest.** Short enough to type from a phone; a
 *     database read must not hand somebody every pending login code.
 *   - **Ten-minute expiry, five attempts.** A six-digit code is one in a
 *     million per guess, so unlimited attempts would fall in hours.
 *   - **Rate limited three ways** — a cooldown between sends, a per-address
 *     hourly cap and a per-IP hourly cap. Without the IP cap one attacker can
 *     use the store as a free mail cannon against many addresses.
 *   - **Old codes are consumed when a new one is issued**, so a code read over
 *     someone's shoulder stops working the moment they ask for another.
 */

export const OTP_COOLDOWN_SECONDS = 60;
const MAX_PER_EMAIL_PER_HOUR = 5;
const MAX_PER_IP_PER_HOUR = 15;

export type OtpIssueResult =
  | { ok: true; code: string; expiresAt: Date }
  | { ok: false; reason: "cooldown" | "email_limit" | "ip_limit"; retryAfterSeconds: number };

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "no_code" | "expired" | "too_many_attempts" | "mismatch"; attemptsLeft?: number };

const hourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

export async function issueOtp(
  email: string,
  purpose: OtpPurpose,
  ip: string,
): Promise<OtpIssueResult> {
  await connectDb();
  const address = email.toLowerCase().trim();

  const latest = await OtpToken.findOne({ email: address, purpose }).sort({ createdAt: -1 });
  if (latest) {
    const age = (Date.now() - new Date(latest.createdAt).getTime()) / 1000;
    if (age < OTP_COOLDOWN_SECONDS) {
      return { ok: false, reason: "cooldown", retryAfterSeconds: Math.ceil(OTP_COOLDOWN_SECONDS - age) };
    }
  }

  const [emailCount, ipCount] = await Promise.all([
    OtpToken.countDocuments({ email: address, createdAt: { $gte: hourAgo() } }),
    ip ? OtpToken.countDocuments({ ip, createdAt: { $gte: hourAgo() } }) : Promise.resolve(0),
  ]);

  if (emailCount >= MAX_PER_EMAIL_PER_HOUR) {
    return { ok: false, reason: "email_limit", retryAfterSeconds: 3600 };
  }
  if (ipCount >= MAX_PER_IP_PER_HOUR) {
    return { ok: false, reason: "ip_limit", retryAfterSeconds: 3600 };
  }

  // Any earlier live code for this address stops working now.
  await OtpToken.updateMany(
    { email: address, purpose, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );

  // randomInt is drawn from the CSPRNG; Math.random is predictable enough to
  // be worth avoiding for anything that grants access.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OtpToken.create({
    email: address,
    purpose,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt,
    ip,
  });

  return { ok: true, code, expiresAt };
}

export async function verifyOtp(
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<OtpVerifyResult> {
  await connectDb();
  const address = email.toLowerCase().trim();

  const token = await OtpToken.findOne({ email: address, purpose, consumedAt: null }).sort({
    createdAt: -1,
  });

  if (!token) return { ok: false, reason: "no_code" };
  if (token.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (token.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  const matches = await bcrypt.compare(code.trim(), token.codeHash);
  if (!matches) {
    token.attempts += 1;
    await token.save();
    return {
      ok: false,
      reason: "mismatch",
      attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - token.attempts),
    };
  }

  // Single use. Marked consumed before the caller creates a session, so a
  // replay of the same code cannot produce a second one.
  token.consumedAt = new Date();
  await token.save();
  return { ok: true };
}

/** Constant-time string comparison, for secrets compared outside bcrypt
 *  (quote tokens, webhook secrets). Length is not secret; content is. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
