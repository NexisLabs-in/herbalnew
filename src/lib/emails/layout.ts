import "server-only";
import type { Locale } from "../i18n";

/** Email templates as plain tagged strings rather than React components.
 *
 *  Email clients are a decade behind browsers: no flexbox in Outlook, no
 *  external stylesheets, no custom fonts worth relying on. So everything here
 *  is inline-styled, single-column, and built to survive being stripped back to
 *  plain text — which `sendMail` does automatically for the text part.
 *
 *  The palette matches the storefront's brand tokens (violet #512BC7, fern
 *  #29511F) but is hardcoded: an email cannot read CSS variables.
 */

const VIOLET = "#512BC7";
const INK = "#1a1330";
const MUTED = "#6b6482";
const LINE = "#e6e2f2";
const PAPER = "#faf9fd";

export type EmailShellOptions = {
  locale: Locale;
  preheader?: string;
  storeName?: string;
  siteUrl?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailShell(body: string, options: EmailShellOptions): string {
  const { locale, preheader = "", storeName = "Herbedia", siteUrl = "" } = options;
  const rtl = locale === "ar";
  const align = rtl ? "right" : "left";

  return `<!doctype html>
<html lang="${locale}" dir="${rtl ? "rtl" : "ltr"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${PAPER};color:${INK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!-- Preheader: the grey line a client shows next to the subject. Hidden in
       the body itself, which is why it is clipped rather than display:none —
       some clients ignore display:none and print it at the top. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;text-align:${align};">
          <p style="margin:0;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${VIOLET};font-weight:600;">${escapeHtml(storeName)}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 32px;text-align:${align};font-size:15px;line-height:1.65;">
          ${body}
        </td></tr>
      </table>
      <p style="max-width:560px;margin:20px auto 0;font-size:12px;line-height:1.6;color:${MUTED};text-align:${align};">
        ${escapeHtml(storeName)}${siteUrl ? ` · <a href="${siteUrl}" style="color:${MUTED};">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>` : ""}
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export const h1 = (text: string, align: "left" | "right" = "left") =>
  `<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:600;color:${INK};text-align:${align};">${escapeHtml(text)}</h1>`;

export const p = (text: string) =>
  `<p style="margin:0 0 14px;color:${INK};">${escapeHtml(text)}</p>`;

export const muted = (text: string) =>
  `<p style="margin:0 0 14px;font-size:13px;color:${MUTED};">${escapeHtml(text)}</p>`;

/** A one-time code, spaced so it can be read aloud and copied by eye. */
export const codeBlock = (code: string) =>
  `<div style="margin:22px 0;padding:18px;background:${PAPER};border:1px solid ${LINE};border-radius:10px;text-align:center;">
     <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:30px;letter-spacing:.32em;font-weight:600;color:${VIOLET};">${escapeHtml(code)}</span>
   </div>`;

export const button = (label: string, href: string) =>
  `<div style="margin:24px 0;">
     <a href="${href}" style="display:inline-block;background:${VIOLET};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:600;font-size:15px;">${escapeHtml(label)}</a>
   </div>`;

export const rule = () => `<hr style="border:none;border-top:1px solid ${LINE};margin:24px 0;">`;
