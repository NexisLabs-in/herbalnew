"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type SectionType } from "@/lib/models/enums";
import { SECTION_LABELS } from "@/lib/cms/registry";
import { cmsPagePath } from "@/lib/cms/routes";
import { savePage } from "@/server/actions/content";
import type { ActionState } from "@/lib/validation/shared";
import { BilingualField, TextField, Toggle, emptyTL, type TL } from "./fields/Fields";

const GENERAL_SECTIONS: SectionType[] = ["richText", "noteBox", "traditionsRibbon", "ctaBanner"];
const HOME_SECTIONS: SectionType[] = ["hero", "trustStrip", "featuredProducts", "categoryGrid", "methodTeaser", "advisory"];
const FAQ_SECTIONS: SectionType[] = ["accordion"];

function addableFor(slug: string): SectionType[] {
  if (slug === "home") return [...GENERAL_SECTIONS, ...HOME_SECTIONS];
  if (slug === "faq") return [...GENERAL_SECTIONS, ...FAQ_SECTIONS];
  return GENERAL_SECTIONS;
}

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
  headingLabel,
  introLabel,
}: {
  slug: string;
  initial: Value;
  /** An empty, valid instance of each section type, built by the registry on
   *  the server so the client never has to know the shapes. */
  blanks: Record<string, Record<string, unknown>>;
  /** Policies uses these for the line customers see, not the search fields. */
  headingLabel?: string;
  introLabel?: string;
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
      const result = await savePage(slug, {
        ...value,
        sections: value.sections.map(normaliseSection),
      });
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
        const pairs = isPairList(section.type, key);
        return (
          <ListField
            key={key}
            label={humanise(key)}
            items={fieldValue}
            pairs={pairs}
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
      <div className="admin-fieldset">
        <div className="admin-fieldset__head">
          <h2 className="admin-fieldset__legend">Page</h2>
        </div>
        <div className="admin-fieldset__body">
          <BilingualField
            label={headingLabel ?? "Title"}
            required
            value={value.title}
            hint={headingLabel ? "The heading at the top of the page." : undefined}
            onChange={(next) => setValue({ ...value, title: next })}
          />
          <BilingualField
            label="SEO title"
            value={value.seo.title}
            hint="Leave empty to use the page heading."
            onChange={(next) => setValue({ ...value, seo: { ...value.seo, title: next } })}
          />
          <BilingualField
            label={introLabel ?? "SEO description"}
            multiline
            rows={2}
            value={value.seo.description}
            hint={introLabel ? "The line under the heading. Also used as the search description." : undefined}
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

      {value.sections.map((section, index) => {
        const sectionHeading = asTL(section.data.heading).en.trim();
        const named = slug === "legal" && Boolean(sectionHeading);
        return (
        <div className="admin-fieldset" key={`${section.type}-${index}`}>
          <div className="admin-fieldset__head admin-review__head">
            <div>
              <h2 className="admin-fieldset__legend">
                {named ? sectionHeading : SECTION_LABELS[section.type].label}
              </h2>
              <p className="admin-fieldset__hint">
                {named
                  ? "One panel on the policies page. A blank line starts a new numbered point."
                  : SECTION_LABELS[section.type].hint}
              </p>
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
        );
      })}

      {adding ? (
        <div className="admin-card" style={{ marginBottom: "1.25rem" }}>
          <p className="field__label" style={{ marginBottom: ".75rem" }}>
            Add a section
          </p>
          {slug === "home" ? (
            <p className="admin-note" style={{ marginBottom: ".85rem" }}>
              Hero, Featured products, Category grid, Method teaser and Health notice are listed here so a deleted homepage block can be put back. They are not offered on other pages.
            </p>
          ) : null}
          <div className="section-choices">
            {addableFor(slug).map((type) => (
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
        <a className="btn btn--ghost" href={cmsPagePath(slug)} target="_blank" rel="noreferrer">
          View page
        </a>

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

/** Question lists are empty until the first item is added, so the shape cannot
 *  be guessed from an existing row — an empty Questions block must still add
 *  a question and answer, not a plain line. */
function isPairList(type: SectionType, key: string): boolean {
  return type === "accordion" && key === "items";
}

function asPair(item: unknown): { q: TL; a: TL } {
  if (item && typeof item === "object" && "q" in item) {
    const pair = item as { q?: unknown; a?: unknown };
    return { q: asTL(pair.q), a: asTL(pair.a) };
  }
  return { q: asTL(item), a: emptyTL() };
}

function normaliseSection(section: EditorSection): EditorSection {
  if (section.type !== "accordion" || !Array.isArray(section.data.items)) return section;
  return {
    ...section,
    data: { ...section.data, items: section.data.items.map(asPair) },
  };
}

/** A repeatable list — plain bilingual lines, or question and answer pairs. */
function ListField({
  label,
  items,
  pairs,
  onChange,
}: {
  label: string;
  items: unknown[];
  pairs: boolean;
  onChange: (items: unknown[]) => void;
}) {
  const add = () =>
    onChange([...items, pairs ? { q: emptyTL(), a: emptyTL() } : emptyTL()]);

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
        const pair = asPair(item);
        const single = asTL(item);

        return (
          <div className="admin-list__row" key={index}>
            <div className="admin-list__inputs">
              {pairs ? (
                <>
                  <BilingualField
                    label="Question"
                    value={pair.q}
                    onChange={(next) =>
                      onChange(items.map((entry, i) => (i === index ? { ...asPair(entry), q: next } : entry)))
                    }
                  />
                  <BilingualField
                    label="Answer"
                    multiline
                    rows={3}
                    value={pair.a}
                    onChange={(next) =>
                      onChange(items.map((entry, i) => (i === index ? { ...asPair(entry), a: next } : entry)))
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
