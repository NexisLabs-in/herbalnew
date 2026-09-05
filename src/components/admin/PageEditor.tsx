"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SECTION_TYPES, type SectionType } from "@/lib/models/enums";
import { SECTION_LABELS } from "@/lib/cms/registry";
import { savePage } from "@/server/actions/content";
import type { ActionState } from "@/lib/validation/shared";
import { BilingualField, TextField, Toggle, emptyTL, type TL } from "./fields/Fields";

/** The page builder.
 *
 *  Sections are added from a fixed list, reordered, hidden or removed — but not
 *  invented. Every type maps onto a component the design system already has, so
 *  a page assembled here cannot come out looking unlike the rest of the site.
 *
 *  Editing is generic over the section data: the registry validates shapes on
 *  the server, and this renders whatever fields a section actually has rather
 *  than carrying a bespoke form per type.
 */

export type EditorSection = {
  type: SectionType;
  visible: boolean;
  data: Record<string, unknown>;
};

type Value = {
  title: TL;
  seo: { title: TL; description: TL };
  published: boolean;
  sections: EditorSection[];
};

const isTL = (value: unknown): value is { en?: string; ar?: string } =>
  typeof value === "object" && value !== null && !Array.isArray(value) && ("en" in value || "ar" in value);

const asTL = (value: unknown): TL => {
  const record = (value ?? {}) as { en?: string; ar?: string };
  return { en: record.en ?? "", ar: record.ar ?? "" };
};

/** Long-form fields get a textarea; short ones a single line. Deciding by name
 *  keeps the editor generic while still feeling hand-made. */
const MULTILINE = new Set(["body", "note", "sub", "description", "a"]);

export function PageEditor({
  slug,
  initial,
  blanks,
}: {
  slug: string;
  initial: Value;
  /** An empty, valid instance of each section type, built by the registry on
   *  the server so the client never has to know the shapes. */
  blanks: Record<string, Record<string, unknown>>;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Value>(initial);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);

  const update = (index: number, next: EditorSection) =>
    setValue((current) => ({
      ...current,
      sections: current.sections.map((section, i) => (i === index ? next : section)),
    }));

  const setField = (index: number, key: string, fieldValue: unknown) => {
    const section = value.sections[index];
    update(index, { ...section, data: { ...section.data, [key]: fieldValue } });
  };

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= value.sections.length) return;
    const copy = [...value.sections];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setValue({ ...value, sections: copy });
  };

  const save = () =>
    start(async () => {
      const result = await savePage(slug, value);
      setState(result);
      if (result.ok) router.refresh();
    });

  /** Renders whatever fields this section's data actually contains. */
  const renderFields = (index: number, section: EditorSection) =>
    Object.entries(section.data).map(([key, fieldValue]) => {
      // A bilingual string.
      if (isTL(fieldValue)) {
        return (
          <BilingualField
            key={key}
            label={humanise(key)}
            value={asTL(fieldValue)}
            multiline={MULTILINE.has(key)}
            rows={key === "body" ? 5 : 3}
            onChange={(next) => setField(index, key, next)}
          />
        );
      }

      // A link: label plus href.
      if (isLink(fieldValue)) {
        const link = fieldValue as { label?: unknown; href?: string };
        return (
          <div key={key} className="admin-fieldset" style={{ margin: 0, padding: "1rem 1.1rem" }}>
            <p className="field__label" style={{ marginBottom: ".75rem" }}>
              {humanise(key)}
            </p>
            <div className="stack" style={{ ["--stack" as string]: ".85rem" }}>
              <BilingualField
                label="Button text"
                value={asTL(link.label)}
                onChange={(next) => setField(index, key, { ...link, label: next })}
              />
              <TextField
                label="Links to"
                monospace
                value={link.href ?? ""}
                hint="A path such as /en/shop, or a full address."
                onChange={(next) => setField(index, key, { ...link, href: next })}
              />
            </div>
          </div>
        );
      }

      // A list of bilingual strings, or of question/answer pairs.
      if (Array.isArray(fieldValue)) {
        return (
          <ListField
            key={key}
            label={humanise(key)}
            items={fieldValue}
            onChange={(next) => setField(index, key, next)}
          />
        );
      }

      if (typeof fieldValue === "boolean") {
        return (
          <Toggle
            key={key}
            label={humanise(key)}
            checked={fieldValue}
            onChange={(next) => setField(index, key, next)}
          />
        );
      }

      return (
        <TextField
          key={key}
          label={humanise(key)}
          value={String(fieldValue ?? "")}
          type={typeof fieldValue === "number" ? "number" : "text"}
          onChange={(next) => setField(index, key, typeof fieldValue === "number" ? Number(next) : next)}
        />
      );
    });

  return (
    <div>
      {state.error ? (
        <p className="auth-card__error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="admin-note" role="status" style={{ marginBottom: "1.25rem" }}>
          {state.notice}
        </p>
      ) : null}

      <div className="admin-fieldset">
        <div className="admin-fieldset__head">
          <h2 className="admin-fieldset__legend">Page</h2>
        </div>
        <div className="admin-fieldset__body">
          <BilingualField
            label="Title"
            required
            value={value.title}
            onChange={(next) => setValue({ ...value, title: next })}
          />
          <BilingualField
            label="SEO title"
            value={value.seo.title}
            hint="Leave empty to use the page title."
            onChange={(next) => setValue({ ...value, seo: { ...value.seo, title: next } })}
          />
          <BilingualField
            label="SEO description"
            multiline
            rows={2}
            value={value.seo.description}
            onChange={(next) => setValue({ ...value, seo: { ...value.seo, description: next } })}
          />
          <Toggle
            label="Published"
            hint="Unpublishing hides the page from the storefront."
            checked={value.published}
            onChange={(next) => setValue({ ...value, published: next })}
          />
        </div>
      </div>

      {value.sections.map((section, index) => (
        <div className="admin-fieldset" key={`${section.type}-${index}`}>
          <div className="admin-fieldset__head admin-review__head">
            <div>
              <h2 className="admin-fieldset__legend">{SECTION_LABELS[section.type].label}</h2>
              <p className="admin-fieldset__hint">{SECTION_LABELS[section.type].hint}</p>
            </div>
            <div className="admin-list__tools">
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Move down"
                disabled={index === value.sections.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="admin-icon-btn"
                aria-label={section.visible ? "Hide" : "Show"}
                title={section.visible ? "Hide this section" : "Show this section"}
                onClick={() => update(index, { ...section, visible: !section.visible })}
              >
                {section.visible ? "◉" : "○"}
              </button>
              <button
                type="button"
                className="admin-icon-btn admin-icon-btn--danger"
                aria-label="Remove"
                onClick={() =>
                  setValue({ ...value, sections: value.sections.filter((_, i) => i !== index) })
                }
              >
                ×
              </button>
            </div>
          </div>

          <div className="admin-fieldset__body">
            {!section.visible ? (
              <p className="admin-note">Hidden — this section is not shown on the site.</p>
            ) : null}
            {renderFields(index, section)}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="admin-card" style={{ marginBottom: "1.25rem" }}>
          <p className="field__label" style={{ marginBottom: ".75rem" }}>
            Add a section
          </p>
          <div className="section-choices">
            {SECTION_TYPES.map((type) => (
              <button
                className="section-choice"
                type="button"
                key={type}
                onClick={() => {
                  setValue({
                    ...value,
                    sections: [
                      ...value.sections,
                      { type, visible: true, data: structuredClone(blanks[type] ?? {}) },
                    ],
                  });
                  setAdding(false);
                }}
              >
                <strong>{SECTION_LABELS[type].label}</strong>
                <span>{SECTION_LABELS[type].hint}</span>
              </button>
            ))}
          </div>
          <button className="btn btn--ghost btn--sm" type="button" style={{ marginTop: "1rem" }} onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn btn--ghost btn--sm" type="button" onClick={() => setAdding(true)}>
          Add a section
        </button>
      )}

      <div className="admin-formbar">
        <button className="btn btn--brand" type="button" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save page"}
        </button>
        <a className="btn btn--ghost" href={`/en/${slug === "home" ? "" : slug}`} target="_blank" rel="noreferrer">
          View page
        </a>
      </div>
    </div>
  );
}

function isLink(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "href" in (value as Record<string, unknown>)
  );
}

function humanise(key: string): string {
  const words = key.replace(/([A-Z])/g, " $1").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A repeatable list — plain bilingual lines, or question and answer pairs.
 *  Both shapes appear in the registry, and the editor stays generic by looking
 *  at what the first item actually is. */
function ListField({
  label,
  items,
  onChange,
}: {
  label: string;
  items: unknown[];
  onChange: (items: unknown[]) => void;
}) {
  const isPairs = items.length > 0 && typeof items[0] === "object" && items[0] !== null && "q" in (items[0] as object);

  const add = () =>
    onChange([...items, isPairs ? { q: emptyTL(), a: emptyTL() } : emptyTL()]);

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

      {items.map((item, index) => {
        const pair = item as { q?: unknown; a?: unknown };
        const single = asTL(item);

        return (
          <div className="admin-list__row" key={index}>
            <div className="admin-list__inputs">
              {"q" in (item as object) ? (
                <>
                  <BilingualField
                    label="Question"
                    value={asTL(pair.q)}
                    onChange={(next) =>
                      onChange(items.map((entry, i) => (i === index ? { ...pair, q: next } : entry)))
                    }
                  />
                  <BilingualField
                    label="Answer"
                    multiline
                    rows={3}
                    value={asTL(pair.a)}
                    onChange={(next) =>
                      onChange(items.map((entry, i) => (i === index ? { ...pair, a: next } : entry)))
                    }
                  />
                </>
              ) : (
                <BilingualField
                  label={`Item ${index + 1}`}
                  value={single}
                  onChange={(next) => onChange(items.map((entry, i) => (i === index ? next : entry)))}
                />
              )}
            </div>
            <div className="admin-list__tools">
              <button type="button" className="admin-icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                ↑
              </button>
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Move down"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="admin-icon-btn admin-icon-btn--danger"
                aria-label="Remove"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}

      <button type="button" className="btn btn--ghost btn--sm" onClick={add}>
        Add item
      </button>
    </div>
  );
}
