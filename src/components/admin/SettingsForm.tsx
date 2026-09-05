"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/server/actions/settings";
import { runJob, type JobName } from "@/server/actions/jobs";
import type { ActionState } from "@/lib/validation/shared";
import { BilingualField, Fieldset, SelectField, TextField, Toggle, type TL } from "./fields/Fields";
import { focusFirstError } from "./fields/focusError";

export type SettingsValue = {
  store: { name: string; contactEmail: string; contactPhone: string; address: TL };
  shipping: { flatRate: string; freeAbove: string };
  tax: { enabled: boolean; ratePercent: string; label: TL };
  inventory: { lowStockThreshold: string };
  reviews: { moderationEnabled: boolean };
  invoice: { prefix: string; trn: string; legalLines: TL };
  notifications: { adminAlertEmails: string; digestHourLocal: string };
  cart: { abandonedEmailEnabled: boolean; abandonedAfterHours: string };
};

const JOBS: { name: JobName; label: string; hint: string }[] = [
  { name: "lowStockDigest", label: "Send the low-stock digest", hint: "Normally daily." },
  { name: "abandonedCart", label: "Send abandoned-basket reminders", hint: "Normally hourly." },
  { name: "backInStock", label: "Send back-in-stock notices", hint: "Normally hourly." },
  { name: "expireQuotes", label: "Expire old quotes", hint: "Normally hourly." },
  { name: "retireSales", label: "Retire finished sales", hint: "Normally hourly." },
];

export function SettingsForm({
  initial,
  canRunJobs,
}: {
  initial: SettingsValue;
  canRunJobs: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<SettingsValue>(initial);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const set = <K extends keyof SettingsValue>(key: K, next: SettingsValue[K]) =>
    setValue((current) => ({ ...current, [key]: next }));

  const err = (path: string) => state.fieldErrors?.[path];

  const save = () =>
    start(async () => {
      const result = await saveSettings({
        ...value,
        notifications: {
          ...value.notifications,
          // One address per line is easier to edit than a comma list, and this
          // is where it becomes the array the schema wants.
          adminAlertEmails: value.notifications.adminAlertEmails
            .split(/[\n,]/)
            .map((entry) => entry.trim())
            .filter(Boolean),
        },
      });
      setState(result);
      if (result.ok) router.refresh();
      else focusFirstError(result.fieldErrors);
    });

  const fire = (name: JobName) =>
    start(async () => {
      const result = await runJob(name);
      setState(result);
    });

  return (
    <div>
      <Fieldset legend="Store" hint="Shown on invoices and in emails.">
        <TextField
          label="Store name"
          value={value.store.name}
          onChange={(next) => set("store", { ...value.store, name: next })}
        />
        <div className="admin-row">
          <TextField
            label="Contact email"
            value={value.store.contactEmail}
            onChange={(next) => set("store", { ...value.store, contactEmail: next })}
          />
          <TextField
            label="Contact phone"
            value={value.store.contactPhone}
            onChange={(next) => set("store", { ...value.store, contactPhone: next })}
          />
        </div>
        <BilingualField
          label="Address"
          multiline
          rows={3}
          value={value.store.address}
          onChange={(next) => set("store", { ...value.store, address: next })}
        />
      </Fieldset>

      <Fieldset legend="Shipping" hint="One charge for every order, the same for all products.">
        <div className="admin-row">
          <TextField
            label="Delivery charge"
            path="shipping.flatRate"
            prefix="AED"
            value={value.shipping.flatRate}
            error={err("shipping.flatRate")}
            onChange={(next) => set("shipping", { ...value.shipping, flatRate: next })}
          />
          <TextField
            label="Free delivery above"
            path="shipping.freeAbove"
            prefix="AED"
            value={value.shipping.freeAbove}
            error={err("shipping.freeAbove")}
            hint="Leave empty to always charge. Judged on the basket total after any discount."
            onChange={(next) => set("shipping", { ...value.shipping, freeAbove: next })}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Tax" hint="Added at checkout as its own line, not built into prices.">
        <Toggle
          label="Charge tax"
          checked={value.tax.enabled}
          onChange={(next) => set("tax", { ...value.tax, enabled: next })}
        />
        {value.tax.enabled ? (
          <>
            <TextField
              label="Rate"
              prefix="%"
              value={value.tax.ratePercent}
              onChange={(next) => set("tax", { ...value.tax, ratePercent: next })}
            />
            <BilingualField
              label="Shown as"
              value={value.tax.label}
              onChange={(next) => set("tax", { ...value.tax, label: next })}
            />
          </>
        ) : null}
      </Fieldset>

      <Fieldset
        legend="Stock"
        hint="One number drives all three: the badge in this panel, the email you get, and the 'Only X left' notice customers see."
      >
        <TextField
          label="Low-stock threshold"
          type="number"
          value={value.inventory.lowStockThreshold}
          onChange={(next) => set("inventory", { lowStockThreshold: next })}
        />
      </Fieldset>

      <Fieldset legend="Reviews">
        <Toggle
          label="Approve reviews before they appear"
          hint="Affects new reviews only. Nothing already published is withdrawn."
          checked={value.reviews.moderationEnabled}
          onChange={(next) => set("reviews", { moderationEnabled: next })}
        />
      </Fieldset>

      <Fieldset legend="Invoices">
        <div className="admin-row">
          <TextField
            label="Invoice prefix"
            monospace
            value={value.invoice.prefix}
            hint="Kept different from the order prefix so the two are told apart."
            onChange={(next) => set("invoice", { ...value.invoice, prefix: next })}
          />
          <TextField
            label="Tax registration number"
            monospace
            value={value.invoice.trn}
            onChange={(next) => set("invoice", { ...value.invoice, trn: next })}
          />
        </div>
        <BilingualField
          label="Footer text"
          multiline
          rows={3}
          value={value.invoice.legalLines}
          onChange={(next) => set("invoice", { ...value.invoice, legalLines: next })}
        />
      </Fieldset>

      <Fieldset legend="Notifications" hint="Who hears about orders, enquiries, messages and low stock.">
        <label className="field">
          <span className="field__label">Alert addresses</span>
          <textarea
            className="field__input"
            rows={3}
            value={value.notifications.adminAlertEmails}
            placeholder="One address per line"
            onChange={(event) =>
              set("notifications", { ...value.notifications, adminAlertEmails: event.target.value })
            }
          />
          <span className="field__hint">One per line. Leave empty to switch alerts off.</span>
        </label>

        <SelectField
          label="Daily digest hour"
          value={value.notifications.digestHourLocal}
          options={Array.from({ length: 24 }, (_, hour) => ({
            value: String(hour),
            label: `${String(hour).padStart(2, "0")}:00`,
          }))}
          hint="Store time. Takes effect when the server next restarts."
          onChange={(next) => set("notifications", { ...value.notifications, digestHourLocal: next })}
        />
      </Fieldset>

      <Fieldset legend="Abandoned baskets">
        <Toggle
          label="Remind customers about a basket they left"
          hint="Signed-in customers only, once per basket."
          checked={value.cart.abandonedEmailEnabled}
          onChange={(next) => set("cart", { ...value.cart, abandonedEmailEnabled: next })}
        />
        <TextField
          label="Wait this many hours"
          type="number"
          value={value.cart.abandonedAfterHours}
          onChange={(next) => set("cart", { ...value.cart, abandonedAfterHours: next })}
        />
      </Fieldset>

      {canRunJobs ? (
        <Fieldset
          legend="Run a job now"
          hint="These run on a schedule. Running one by hand is safe — nothing is ever sent twice."
        >
          <div className="admin-jobs">
            {JOBS.map((job) => (
              <button
                className="btn btn--ghost btn--sm"
                type="button"
                key={job.name}
                disabled={pending}
                title={job.hint}
                onClick={() => fire(job.name)}
              >
                {job.label}
              </button>
            ))}
          </div>
        </Fieldset>
      ) : null}

      <div className="admin-formbar">
        <button className="btn btn--brand" type="button" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save settings"}
        </button>

        {state.error ? (
          <p className="admin-formbar__msg admin-formbar__msg--error" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.notice && !state.error ? (
          <p className="admin-formbar__msg admin-formbar__msg--ok" role="status">
            {state.notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
