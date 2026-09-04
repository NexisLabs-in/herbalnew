"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { clearCustomerSession, createCustomerSession } from "@/lib/auth/session";
import { loginCodeEmail } from "@/lib/emails/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { sendMail } from "@/lib/mail";
import { Customer } from "@/lib/models/Customer";

/** Customer login: email, then a six-digit code (C5).
 *
 *  No password, and no registration step — the account is created on first
 *  successful code. Name and address are collected later, at first checkout or
 *  in account settings, which is exactly what the client asked for: nothing
 *  stands between a shopper and their basket except proving they own an inbox.
 */

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const codeSchema = z.string().trim().regex(/^\d{6}$/);

export type LoginState = {
  stage: "email" | "code";
  email?: string;
  error?: string;
  notice?: string;
};

/** Client IP, for rate limiting. Behind a proxy (which the VPS deployment will
 *  have) the socket address is the proxy's, so the forwarded header is the only
 *  useful signal — spoofable, which is why it is one limit of three and never
 *  the only defence. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
}

const MESSAGES = {
  badEmail: { en: "Enter a valid email address.", ar: "أدخل بريداً إلكترونياً صحيحاً." },
  cooldown: {
    en: "A code was just sent. Check your inbox, or try again in a moment.",
    ar: "تم إرسال رمز للتو. تحقق من بريدك أو حاول بعد قليل.",
  },
  tooMany: {
    en: "Too many code requests. Try again in an hour.",
    ar: "طلبات كثيرة جداً. حاول مرة أخرى بعد ساعة.",
  },
  sent: {
    en: "We sent a six-digit code to your email. It expires in 10 minutes.",
    ar: "أرسلنا رمزاً من ستة أرقام إلى بريدك. تنتهي صلاحيته خلال ١٠ دقائق.",
  },
  badCode: { en: "That code is not right.", ar: "الرمز غير صحيح." },
  expired: {
    en: "That code has expired. Ask for a new one.",
    ar: "انتهت صلاحية الرمز. اطلب رمزاً جديداً.",
  },
  lockedOut: {
    en: "Too many attempts. Ask for a new code.",
    ar: "محاولات كثيرة جداً. اطلب رمزاً جديداً.",
  },
  blocked: {
    en: "This account cannot sign in. Please contact us.",
    ar: "لا يمكن تسجيل الدخول بهذا الحساب. يرجى التواصل معنا.",
  },
} as const;

export async function requestLoginCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = String(formData.get("locale") ?? "en");
  const lang: Locale = isLocale(raw) ? raw : "en";

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { stage: "email", error: MESSAGES.badEmail[lang] };

  const email = parsed.data;
  const issued = await issueOtp(email, "customer_login", await clientIp());

  if (!issued.ok) {
    // A cooldown still shows the code screen: the customer already has a
    // working code in their inbox, so sending them back to the email field
    // would be wrong even though this send was refused.
    if (issued.reason === "cooldown") {
      return { stage: "code", email, notice: MESSAGES.cooldown[lang] };
    }
    return { stage: "email", email, error: MESSAGES.tooMany[lang] };
  }

  const { subject, html } = loginCodeEmail(issued.code, lang);
  await sendMail({ to: email, subject, html });

  return { stage: "code", email, notice: MESSAGES.sent[lang] };
}

export async function verifyLoginCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = String(formData.get("locale") ?? "en");
  const lang: Locale = isLocale(raw) ? raw : "en";
  const next = String(formData.get("next") ?? "");

  const email = emailSchema.safeParse(formData.get("email"));
  const code = codeSchema.safeParse(formData.get("code"));

  if (!email.success) return { stage: "email", error: MESSAGES.badEmail[lang] };
  if (!code.success) return { stage: "code", email: email.data, error: MESSAGES.badCode[lang] };

  const result = await verifyOtp(email.data, "customer_login", code.data);
  if (!result.ok) {
    const error =
      result.reason === "expired" || result.reason === "no_code"
        ? MESSAGES.expired[lang]
        : result.reason === "too_many_attempts"
          ? MESSAGES.lockedOut[lang]
          : MESSAGES.badCode[lang];
    return { stage: "code", email: email.data, error };
  }

  await connectDb();
  // The account is created here, on first successful code — there is no
  // separate registration step.
  const customer = await Customer.findOneAndUpdate(
    { email: email.data },
    {
      $set: { emailVerifiedAt: new Date(), lastLoginAt: new Date() },
      $setOnInsert: { email: email.data },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  if (!customer || customer.status === "blocked") {
    return { stage: "email", email: email.data, error: MESSAGES.blocked[lang] };
  }

  await createCustomerSession({ customerId: String(customer._id), email: customer.email });

  // Same-site paths only: an open redirect here would let a phishing link send
  // a freshly logged-in customer to an attacker's page.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : `/${lang}/account`;
  redirect(destination);
}

export async function logoutCustomer(locale: string): Promise<void> {
  await clearCustomerSession();
  redirect(`/${isLocale(locale) ? locale : "en"}`);
}
