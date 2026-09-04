import "server-only";
import { Resend } from "resend";
import { env, live } from "./env";

/** Transactional email behind one interface.
 *
 *  The plan defers real credentials to launch, so `MAIL_DRIVER=console` is the
 *  default and every message is logged instead of sent. Call sites never branch
 *  on the driver — they call `sendMail` and move on, which keeps the switch to
 *  Resend a one-line env change rather than an edit across every flow.
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
function client(): Resend {
  resend ??= new Resend(env.RESEND_API_KEY);
  return resend;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const to = Array.isArray(message.to) ? message.to : [message.to];

  if (!live.mail) {
    console.info(
      `[mail:console] to=${to.join(", ")} subject=${JSON.stringify(message.subject)}\n` +
        (message.text ?? stripTags(message.html)),
    );
    return { sent: false, id: "console" };
  }

  try {
    const { data, error } = await client().emails.send({
      from: env.MAIL_FROM,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text ?? stripTags(message.html),
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
