"use client";

import type { ReactNode } from "react";

/** Form primitives for the admin panel.
 *
 *  Controlled inputs throughout: the product form holds one state object and
 *  serialises it to JSON on submit, so every field reports upward rather than
 *  being read from the DOM at the end.
 */

export type TL = { en: string; ar: string };

export const emptyTL = (): TL => ({ en: "", ar: "" });

export function Fieldset({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-fieldset">
      <div className="admin-fieldset__head">
        <h2 className="admin-fieldset__legend">{legend}</h2>
        {hint ? <p className="admin-fieldset__hint">{hint}</p> : null}
      </div>
      <div className="admin-fieldset__body">{children}</div>
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  type = "text",
  prefix,
  required,
  disabled,
  monospace,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  type?: "text" | "number" | "email";
  prefix?: string;
  required?: boolean;
  disabled?: boolean;
  monospace?: boolean;
}) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {required ? <span className="field__req"> *</span> : null}
      </span>
      <span className={prefix ? "field__wrap" : undefined}>
        {prefix ? <span className="field__prefix">{prefix}</span> : null}
        <input
          className="field__input"
          style={monospace ? { fontFamily: "var(--font-mono), monospace" } : undefined}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  hint,
  error,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
  error?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <textarea
        className="field__input"
        rows={rows}
        dir={dir}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

/** English and Arabic side by side.
 *
 *  English is required and Arabic is not (plan §3). The Arabic side is marked
 *  when empty rather than blocking the save — an untranslated product still
 *  sells, and the storefront falls back to English. Marking it is what stops
 *  "we will translate it later" becoming invisible.
 */
export function BilingualField({
  label,
  value,
  onChange,
  multiline,
  rows,
  hint,
  errors,
  required,
}: {
  label: string;
  value: TL;
  onChange: (value: TL) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  errors?: { en?: string; ar?: string };
  required?: boolean;
}) {
  const missingArabic = value.en.trim() !== "" && value.ar.trim() === "";

  return (
    <div className="admin-bilingual">
      <div className="admin-bilingual__head">
        <span className="field__label">
          {label}
          {required ? <span className="field__req"> *</span> : null}
        </span>
        {missingArabic ? <span className="admin-chip admin-chip--warn">No Arabic</span> : null}
      </div>

      <div className="admin-bilingual__pair">
        <div>
          <span className="admin-bilingual__lang">English</span>
          {multiline ? (
            <textarea
              className="field__input"
              rows={rows ?? 4}
              value={value.en}
              aria-invalid={errors?.en ? true : undefined}
              onChange={(event) => onChange({ ...value, en: event.target.value })}
            />
          ) : (
            <input
              className="field__input"
              value={value.en}
              aria-invalid={errors?.en ? true : undefined}
              onChange={(event) => onChange({ ...value, en: event.target.value })}
            />
          )}
          {errors?.en ? <span className="field__error">{errors.en}</span> : null}
        </div>

        <div>
          <span className="admin-bilingual__lang">العربية</span>
          {multiline ? (
            <textarea
              className="field__input"
              rows={rows ?? 4}
              dir="rtl"
              lang="ar"
              value={value.ar}
              onChange={(event) => onChange({ ...value, ar: event.target.value })}
            />
          ) : (
            <input
              className="field__input"
              dir="rtl"
              lang="ar"
              value={value.ar}
              onChange={(event) => onChange({ ...value, ar: event.target.value })}
            />
          )}
          {errors?.ar ? <span className="field__error">{errors.ar}</span> : null}
        </div>
      </div>

      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  error,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
  error?: string;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select
        className="field__input"
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`admin-toggle${disabled ? " admin-toggle--off" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="admin-toggle__label">{label}</span>
        {hint ? <span className="admin-toggle__hint">{hint}</span> : null}
      </span>
    </label>
  );
}

/** A repeatable list of bilingual lines — cautions, "seek advice" entries.
 *  Order matters (they are read top to bottom on the product page), so entries
 *  can be moved as well as added and removed. */
export function BilingualList({
  label,
  hint,
  items,
  onChange,
  addLabel,
}: {
  label: string;
  hint?: string;
  items: TL[];
  onChange: (items: TL[]) => void;
  addLabel: string;
}) {
  const update = (index: number, next: TL) =>
    onChange(items.map((item, i) => (i === index ? next : item)));

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= items.length) return;
    const copy = [...items];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  };

  return (
    <div className="admin-list">
      <div className="admin-bilingual__head">
        <span className="field__label">{label}</span>
        <span className="admin-list__count">{items.length}</span>
      </div>
      {hint ? <p className="field__hint" style={{ marginBottom: ".75rem" }}>{hint}</p> : null}

      {items.map((item, index) => (
        <div className="admin-list__row" key={index}>
          <div className="admin-list__inputs">
            <input
              className="field__input"
              placeholder="English"
              value={item.en}
              onChange={(event) => update(index, { ...item, en: event.target.value })}
            />
            <input
              className="field__input"
              placeholder="العربية"
              dir="rtl"
              lang="ar"
              value={item.ar}
              onChange={(event) => update(index, { ...item, ar: event.target.value })}
            />
          </div>
          <div className="admin-list__tools">
            <button type="button" className="admin-icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
              ↑
            </button>
            <button
              type="button"
              className="admin-icon-btn"
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1}
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn--danger"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([...items, emptyTL()])}>
        {addLabel}
      </button>
    </div>
  );
}
