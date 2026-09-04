"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { getAdmin } from "@/lib/auth/guards";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { clearAdminSession, createAdminSession } from "@/lib/auth/session";
import { adminResetCodeEmail } from "@/lib/emails/auth";
import { sendMail } from "@/lib/mail";
import { AdminUser } from "@/lib/models/AdminUser";

/** Admin authentication: password to sign in, emailed OTP to recover.
 *
 *  Admins use a password rather than the customers' OTP-only login because an
 *  admin session is worth far more than a shopper's — OTP-only would put the
 *  entire store behind whoever can read one mailbox.
 */

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200);
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code.");

export type AdminAuthState = { error?: string; notice?: string; stage?: "email" | "code" };

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
}

/** One deliberately vague message for every failure mode.
 *
 *  Saying "no such account" tells an attacker which addresses are admins, and
 *  saying "wrong password" confirms the rest. The admin who mistyped their own
 *  password is not helped enough by the distinction to be worth it. */
const SIGN_IN_FAILED = "Those details are not right.";

export async function adminSignIn(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = z.string().min(1).safeParse(formData.get("password"));
  if (!email.success || !password.success) return { error: SIGN_IN_FAILED };

  await connectDb();
  // passwordHash is `select: false` on the schema, so it must be asked for.
  const admin = await AdminUser.findOne({ email: email.data }).select("+passwordHash");

  if (!admin || !admin.active) {
    // Hash anyway. Returning early on an unknown address makes the response
    // measurably faster than a wrong password, which is enough to enumerate
    // admin accounts by timing alone.
    await bcrypt.compare(password.data, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    return { error: SIGN_IN_FAILED };
  }

  if (!(await bcrypt.compare(password.data, admin.passwordHash))) {
    return { error: SIGN_IN_FAILED };
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  await createAdminSession({ adminId: String(admin._id), email: admin.email });
  redirect(admin.mustChangePassword ? "/admin/set-password" : "/admin");
}

/** Step one of recovery. Always reports success, whether or not the address
 *  belongs to an admin — the response must not reveal who the admins are. */
export async function adminRequestReset(
  _prev: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { stage: "email", error: "Enter a valid email address." };

  await connectDb();
  const admin = await AdminUser.findOne({ email: email.data, active: true });

  if (admin) {
    const issued = await issueOtp(email.data, "admin_reset", await clientIp());
    if (issued.ok) {
      const { subject, html } = adminResetCodeEmail(issued.code);
      await sendMail({ to: email.data, subject, html });
    }
  }

  return {
    stage: "code",
    notice: "If that address belongs to an admin account, a six-digit code is on its way.",
  };
}

export async function adminCompleteReset(
  _prev: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const code = codeSchema.safeParse(formData.get("code"));
  const password = passwordSchema.safeParse(formData.get("password"));
  const confirm = String(formData.get("confirm") ?? "");

  if (!email.success) return { stage: "email", error: "Enter a valid email address." };
  if (!code.success) return { stage: "code", error: code.error.issues[0].message };
  if (!password.success) return { stage: "code", error: password.error.issues[0].message };
  if (password.data !== confirm) return { stage: "code", error: "The two passwords do not match." };

  const verified = await verifyOtp(email.data, "admin_reset", code.data);
  if (!verified.ok) {
    const error =
      verified.reason === "expired" || verified.reason === "no_code"
        ? "That code has expired. Request a new one."
        : verified.reason === "too_many_attempts"
          ? "Too many attempts. Request a new code."
          : "That code is not right.";
    return { stage: "code", error };
  }

  await connectDb();
  const admin = await AdminUser.findOne({ email: email.data, active: true });
  if (!admin) return { stage: "email", error: SIGN_IN_FAILED };

  admin.passwordHash = await bcrypt.hash(password.data, 12);
  admin.mustChangePassword = false;
  await admin.save();

  // Not signed in automatically: proving control of the mailbox is enough to
  // set a password, but the new password should be used at least once.
  return { stage: "email", notice: "Password updated. Sign in with your new password." };
}

/** Used by a seeded or admin-reset account on first sign-in, and by any admin
 *  changing their own password. Requires the current password — a borrowed
 *  session must not be enough to lock the real owner out. */
export async function adminSetPassword(
  _prev: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const context = await getAdmin();
  if (!context) redirect("/admin/login");

  const current = String(formData.get("current") ?? "");
  const password = passwordSchema.safeParse(formData.get("password"));
  const confirm = String(formData.get("confirm") ?? "");

  if (!password.success) return { error: password.error.issues[0].message };
  if (password.data !== confirm) return { error: "The two passwords do not match." };

  await connectDb();
  const admin = await AdminUser.findById(context.adminId).select("+passwordHash");
  if (!admin) redirect("/admin/login");

  if (!(await bcrypt.compare(current, admin.passwordHash))) {
    return { error: "Your current password is not right." };
  }
  if (await bcrypt.compare(password.data, admin.passwordHash)) {
    return { error: "Choose a password you have not used here before." };
  }

  admin.passwordHash = await bcrypt.hash(password.data, 12);
  admin.mustChangePassword = false;
  await admin.save();

  redirect("/admin");
}

export async function adminSignOut(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}
