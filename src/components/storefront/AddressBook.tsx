"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT } from "@/content/account";
import { EMIRATES } from "@/lib/models/enums";
import { removeAddress, setDefaultAddress, upsertAddress } from "@/server/actions/account";
import type { ActionState } from "@/lib/validation/shared";
import { t, type Locale } from "@/lib/i18n";

export type AddressEntry = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  emirate: string;
  isDefault: boolean;
};

type Draft = Omit<AddressEntry, "id">;

const blank = (): Draft => ({
  label: "",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  emirate: "",
  isDefault: false,
});

/** The address book.
 *
 *  Edited in place rather than on separate pages: a customer has two or three
 *  addresses, and seeing them all while editing one is more useful than a
 *  route per record.
 */
export function AddressBook({
  locale,
  addresses,
}: {
  locale: Locale;
  addresses: AddressEntry[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const err = (path: string) => state.fieldErrors?.[path];

  const run = (action: () => Promise<ActionState>, close = false) =>
    start(async () => {
      const result = await action();
      setState(result);
      if (result.ok) {
        if (close) setEditing(null);
        router.refresh();
      }
    });

  const startNew = () => {
    setEditing("new");
    setState({});
    setDraft(blank());
  };

  const startEdit = (address: AddressEntry) => {
    setEditing(address.id);
    setState({});
    const { id, ...rest } = address;
    void id;
    setDraft(rest);
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <>
      {state.error ? (
        <p className="auth-card__error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice && !editing ? (
        <p className="admin-note" role="status" style={{ marginBottom: "1.25rem" }}>
          {state.notice}
        </p>
      ) : null}

      {editing ? (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <p className="eyebrow eyebrow--plain">
            {editing === "new" ? t(ACCOUNT.addAddress, locale) : t(ACCOUNT.editAddress, locale)}
          </p>

          <div className="stack" style={{ ["--stack" as string]: "1rem", marginTop: "1.25rem" }}>
            <label className="field">
              <span className="field__label">{t(ACCOUNT.fullName, locale)}</span>
              <input
                className="field__input"
                value={draft.fullName}
                onChange={(event) => set("fullName", event.target.value)}
              />
              {err("fullName") ? <span className="field__error">{err("fullName")}</span> : null}
            </label>

            <label className="field">
              <span className="field__label">{t(ACCOUNT.phone, locale)}</span>
              <input
                className="field__input"
                dir="ltr"
                value={draft.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
              {err("phone") ? <span className="field__error">{err("phone")}</span> : null}
            </label>

            <label className="field">
              <span className="field__label">{t(ACCOUNT.line1, locale)}</span>
              <input
                className="field__input"
                value={draft.line1}
                onChange={(event) => set("line1", event.target.value)}
              />
              {err("line1") ? <span className="field__error">{err("line1")}</span> : null}
            </label>

            <label className="field">
              <span className="field__label">{t(ACCOUNT.line2, locale)}</span>
              <input
                className="field__input"
                value={draft.line2}
                onChange={(event) => set("line2", event.target.value)}
              />
            </label>

            <div className="field__row">
              <label className="field">
                <span className="field__label">{t(ACCOUNT.city, locale)}</span>
                <input
                  className="field__input"
                  value={draft.city}
                  onChange={(event) => set("city", event.target.value)}
                />
                {err("city") ? <span className="field__error">{err("city")}</span> : null}
              </label>

              <label className="field">
                <span className="field__label">{t(ACCOUNT.emirate, locale)}</span>
                <select
                  className="field__input"
                  value={draft.emirate}
                  onChange={(event) => set("emirate", event.target.value)}
                >
                  <option value="" disabled>
                    {t(ACCOUNT.chooseEmirate, locale)}
                  </option>
                  {EMIRATES.map((emirate) => (
                    <option key={emirate} value={emirate}>
                      {emirate}
                    </option>
                  ))}
                </select>
                {err("emirate") ? <span className="field__error">{err("emirate")}</span> : null}
              </label>
            </div>

            <label className="field">
              <span className="field__label">{t(ACCOUNT.label, locale)}</span>
              <input
                className="field__input"
                value={draft.label}
                placeholder="Home, office…"
                onChange={(event) => set("label", event.target.value)}
              />
            </label>

            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(event) => set("isDefault", event.target.checked)}
              />
              <span className="admin-toggle__label">{t(ACCOUNT.setAsDefault, locale)}</span>
            </label>

            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              <button
                className="btn btn--brand btn--sm"
                type="button"
                disabled={pending}
                onClick={() => run(() => upsertAddress(editing === "new" ? null : editing, draft), true)}
              >
                {pending ? t(ACCOUNT.saving, locale) : t(ACCOUNT.save, locale)}
              </button>
              <button
                className="btn btn--ghost btn--sm"
                type="button"
                onClick={() => setEditing(null)}
              >
                {t(ACCOUNT.cancel, locale)}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ marginBottom: "1.5rem" }}>
          <button className="btn btn--brand btn--sm" type="button" onClick={startNew}>
            {t(ACCOUNT.addAddress, locale)}
          </button>
        </p>
      )}

      {addresses.length === 0 && !editing ? (
        <div className="empty-state">
          <p className="body">{t(ACCOUNT.noAddresses, locale)}</p>
        </div>
      ) : (
        <div className="address-grid">
          {addresses.map((address) => (
            <article className="address-card" key={address.id}>
              {address.isDefault ? (
                <span className="chip chip--brand">{t(ACCOUNT.defaultAddress, locale)}</span>
              ) : null}
              <p className="address-card__name">
                {address.fullName}
                {address.label ? <span className="address-card__label"> · {address.label}</span> : null}
              </p>
              <p className="address-card__body">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.emirate}
                <br />
                <span dir="ltr">{address.phone}</span>
              </p>

              <div className="address-card__tools">
                <button className="link-plain" type="button" onClick={() => startEdit(address)}>
                  {t(ACCOUNT.edit, locale)}
                </button>
                {!address.isDefault ? (
                  <button
                    className="link-plain"
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setDefaultAddress(address.id))}
                  >
                    {t(ACCOUNT.makeDefault, locale)}
                  </button>
                ) : null}
                <button
                  className="link-plain"
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => removeAddress(address.id))}
                >
                  {t(ACCOUNT.remove, locale)}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
