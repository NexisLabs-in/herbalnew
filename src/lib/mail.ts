import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";
import { env, live } from "./env";

/** Transactional email behind one interface.
 *
 *  Call sites never branch on the driver — they call `sendMail` and move on.
 *  `MAIL_DRIVER=console` logs instead of sending (default for local work).
 *  `resend` and `nodemailer` deliver for real when their credentials are set.
 */

export type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type MailResult = { sent: boolean; id?: string; error?: string };

let resend: Resend | null = null;
function resendClient(): Resend {
  resend ??= new Resend(env.RESEND_API_KEY);
  return resend;
}

let smtp: Transporter | null = null;
function smtpClient(): Transporter {
  smtp ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER || env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
  return smtp;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const to = Array.isArray(message.to) ? message.to : [message.to];
  const text = message.text ?? stripTags(message.html);

  if (!live.mail) {
    console.info(
      `[mail:console] to=${to.join(", ")} subject=${JSON.stringify(message.subject)}\n` + text,
    );
    return { sent: false, id: "console" };
  }

  try {
    if (env.MAIL_DRIVER === "nodemailer") {
      const info = await smtpClient().sendMail({
        from: env.MAIL_FROM,
        to,
        subject: message.subject,
        html: message.html,
        text,
        replyTo: message.replyTo,
      });
      return { sent: true, id: typeof info.messageId === "string" ? info.messageId : undefined };
    }

    const { data, error } = await resendClient().emails.send({
      from: env.MAIL_FROM,
      to,
      subject: message.subject,
      html: message.html,
      text,
      replyTo: message.replyTo,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true, id: data?.id };
  } catch (error) {
    // A failed notification must never fail the operation that triggered it —
    // an order is still paid whether or not its confirmation email went out.
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[mail] send failed: ${reason}`);
    return { sent: false, error: reason };
  }
}

/** Plain-text fallback, so a client that refuses HTML still shows something
 *  readable rather than an empty body. */
function stripTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
