import { z } from "zod";

/** Environment contract for the whole app.
 *
 *  Everything a developer needs to boot has a default; everything that moves
 *  money or sends mail does not, and its driver falls back to a stub instead.
 *  That way `npm run dev` works on a fresh clone with only MongoDB running,
 *  while production fails loudly if a real key is missing (see assertLive()).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017"),
  MONGODB_DB: z.string().default("herbedia"),

  // Long enough that HS256 keys are not trivially brute-forced. The defaults are
  // obviously fake so they show up in a grep before launch.
  AUTH_CUSTOMER_SECRET: z.string().min(32).default("dev-only-customer-secret-change-me-please-32ch"),
  AUTH_ADMIN_SECRET: z.string().min(32).default("dev-only-admin-secret-change-me-please-32chars"),

  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().default(""),

  MAIL_DRIVER: z.enum(["console", "resend", "nodemailer"]).default("console"),
  RESEND_API_KEY: z.string().default(""),
  MAIL_FROM: z.string().default("Herbedia <orders@example.com>"),
  // Used when MAIL_DRIVER=nodemailer (any SMTP host: Gmail, SES, Mailgun, …).
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),

  // "local" writes into public/uploads so the catalogue can be built before a
  // bucket exists. S3 is the production driver (plan §3) — local disk does not
  // survive a container rebuild and is not shared between instances.
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().default(""),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default(""),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),

  NEXT_PUBLIC_SITE_URL: z.string().default("http://localhost:3000"),

  CRON_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  TimeZone: z.string().default("Asia/Dubai"),

  SEED_ADMIN_EMAIL: z.string().default("admin@example.com"),
  SEED_ADMIN_PASSWORD: z.string().default(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid environment:\n${issues.join("\n")}`);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";

/** True when a real payment/mail/storage backend is configured. The stub paths
 *  are deliberate during phases 0-11 — the plan defers credentials to launch. */
export const live = {
  stripe: env.STRIPE_SECRET_KEY.length > 0,
  webhook: env.STRIPE_WEBHOOK_SECRET.length > 0,
  mail:
    (env.MAIL_DRIVER === "resend" && env.RESEND_API_KEY.length > 0) ||
    (env.MAIL_DRIVER === "nodemailer" && env.SMTP_HOST.length > 0),
  storage: env.STORAGE_DRIVER === "s3" && env.S3_BUCKET.length > 0,
};

/** Called from instrumentation on boot. In production a stub driver is almost
 *  certainly a misconfiguration, so say so once, loudly, rather than silently
 *  swallowing every order confirmation. */
export function warnAboutStubs(log: (msg: string) => void = console.warn): string[] {
  const stubbed: string[] = [];
  if (!live.stripe) stubbed.push("Stripe (no STRIPE_SECRET_KEY — checkout will refuse)");
  if (!live.mail) {
    if (env.MAIL_DRIVER === "resend") {
      stubbed.push("email (MAIL_DRIVER=resend but RESEND_API_KEY is empty)");
    } else if (env.MAIL_DRIVER === "nodemailer") {
      stubbed.push("email (MAIL_DRIVER=nodemailer but SMTP_HOST is empty)");
    } else {
      stubbed.push("email (MAIL_DRIVER=console — nothing is delivered)");
    }
  }
  if (!live.storage) stubbed.push("storage (STORAGE_DRIVER=local — uploads live on this server's disk)");
  if (stubbed.length && isProd) {
    log(`[env] PRODUCTION IS RUNNING ON STUBS: ${stubbed.join("; ")}`);
  }
  return stubbed;
}
