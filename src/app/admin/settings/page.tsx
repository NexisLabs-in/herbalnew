import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { SettingsForm, type SettingsValue } from "@/components/admin/SettingsForm";
import { requireAdminPage } from "@/lib/auth/guards";
import { toAed } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const aed = (fils: number | null | undefined) =>
  fils === null || fils === undefined ? "" : toAed(fils).toFixed(2);

export default async function AdminSettingsPage() {
  const admin = await requireAdminPage("settings:read");
  const settings = await getSettings();

  const initial: SettingsValue = {
    store: {
      name: settings.store.name,
      contactEmail: settings.store.contactEmail,
      contactPhone: settings.store.contactPhone,
      address: { en: settings.store.address.en, ar: settings.store.address.ar ?? "" },
    },
    shipping: {
      flatRate: aed(settings.shipping.flatRateFils) || "0.00",
      freeAbove: aed(settings.shipping.freeAboveFils),
    },
    tax: {
      enabled: settings.tax.enabled,
      ratePercent: String(settings.tax.ratePercent),
      label: { en: settings.tax.label.en, ar: settings.tax.label.ar ?? "" },
    },
    inventory: { lowStockThreshold: String(settings.inventory.lowStockThreshold) },
    reviews: { moderationEnabled: settings.reviews.moderationEnabled },
    invoice: {
      prefix: settings.invoice.prefix,
      trn: settings.invoice.trn,
      legalLines: { en: settings.invoice.legalLines.en, ar: settings.invoice.legalLines.ar ?? "" },
    },
    notifications: {
      adminAlertEmails: settings.notifications.adminAlertEmails.join("\n"),
      digestHourLocal: String(settings.notifications.digestHourLocal),
    },
    cart: {
      abandonedEmailEnabled: settings.cart.abandonedEmailEnabled,
      abandonedAfterHours: String(settings.cart.abandonedAfterHours),
    },
  };

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Settings</h1>
          <p className="admin-head__sub">Everything here changes the shop without a deploy.</p>
        </div>
      </div>

      <SettingsForm initial={initial} canRunJobs={can(admin.permissions, "settings:write")} />
    </AdminShell>
  );
}
