import { z } from "zod";
import { bilingual } from "../validation/shared";
import { SECTION_TYPES, type SectionType } from "../models/enums";

/** The CMS section registry.
 *
 *  A **fixed** set of section types, each mapped one-to-one onto a component
 *  that already exists. Admins reorder sections and edit copy; they cannot
 *  invent layouts. That is deliberate — a free-form block editor would let
 *  somebody assemble a page the design system cannot render well, and the
 *  storefront's whole value here is that it already looks right.
 *
 *  There is no harvest-calendar section (requirement C9).
 */

const link = z.object({
  label: bilingual({ max: 80 }),
  href: z.string().trim().max(300).default(""),
});

export const SECTION_SCHEMAS = {
  hero: z.object({
    eyebrow: bilingual({ max: 120 }),
    heading: bilingual({ max: 200 }),
    sub: bilingual({ max: 300 }),
    body: bilingual({ max: 1200 }),
    primary: link,
    secondary: link,
  }),

  trustStrip: z.object({
    items: z.array(bilingual({ max: 160 })).max(6),
  }),

  traditionsRibbon: z.object({
    heading: bilingual({ max: 160 }),
    note: bilingual({ max: 400 }),
    items: z.array(bilingual({ max: 80 })).max(12),
  }),

  featuredProducts: z.object({
    heading: bilingual({ max: 160 }),
    sub: bilingual({ max: 400 }),
    /** The products themselves come from the featured flag (C10), not from
     *  here — one place to choose them, not two that can disagree. */
    limit: z.coerce.number().int().min(1).max(12).default(6),
  }),

  categoryGrid: z.object({
    heading: bilingual({ max: 160 }),
    sub: bilingual({ max: 400 }),
  }),

  methodTeaser: z.object({
    heading: bilingual({ max: 160 }),
    body: bilingual({ max: 800 }),
    cta: link,
  }),

  richText: z.object({
    eyebrow: bilingual({ max: 120 }),
    heading: bilingual({ max: 200 }),
    /** Plain text with blank lines between paragraphs. Not HTML: pasted markup
     *  from a word processor is the fastest way to break a page's typography,
     *  and nothing here needs more than paragraphs. */
    body: bilingual({ max: 8000 }),
  }),

  accordion: z.object({
    heading: bilingual({ max: 200 }),
    items: z
      .array(z.object({ q: bilingual({ required: true, max: 300 }), a: bilingual({ max: 4000 }) }))
      .max(60),
  }),

  imageText: z.object({
    heading: bilingual({ max: 200 }),
    body: bilingual({ max: 2000 }),
    image: z.string().default(""),
    imageAlt: bilingual({ max: 200 }),
    side: z.enum(["left", "right"]).default("left"),
    cta: link,
  }),

  advisory: z.object({
    /** No copy of its own — it renders the store-wide advisory, which is a
     *  legal notice and must read identically everywhere it appears. */
    dark: z.boolean().default(false),
  }),

  ctaBanner: z.object({
    heading: bilingual({ max: 200 }),
    body: bilingual({ max: 600 }),
    cta: link,
  }),
} satisfies Record<SectionType, z.ZodTypeAny>;

export const SECTION_LABELS: Record<SectionType, { label: string; hint: string }> = {
  hero: { label: "Hero", hint: "The big opening block with the headline and buttons." },
  trustStrip: { label: "Trust strip", hint: "A row of short promises on a dark band." },
  traditionsRibbon: { label: "Traditions ribbon", hint: "The scrolling list of traditions." },
  featuredProducts: { label: "Featured products", hint: "Products chosen on the Featured screen." },
  categoryGrid: { label: "Category grid", hint: "The shelves, as cards." },
  methodTeaser: { label: "Method teaser", hint: "The numbered method steps with a heading." },
  richText: { label: "Text", hint: "A heading and paragraphs." },
  accordion: { label: "Questions", hint: "Expandable question and answer pairs — used for the FAQ." },
  imageText: { label: "Image and text", hint: "A picture beside a block of copy." },
  advisory: { label: "Health advisory", hint: "The store-wide 'read before ordering' notice." },
  ctaBanner: { label: "Call to action", hint: "A short prompt with one button." },
};

const EMPTY_TL = { en: "", ar: "" };
const EMPTY_LINK = { label: EMPTY_TL, href: "" };

function defaultsFor(type: SectionType): unknown {
  switch (type) {
    case "hero":
      return {
        eyebrow: EMPTY_TL,
        heading: EMPTY_TL,
        sub: EMPTY_TL,
        body: EMPTY_TL,
        primary: EMPTY_LINK,
        secondary: EMPTY_LINK,
      };
    case "trustStrip":
      return { items: [] };
    case "traditionsRibbon":
      return { heading: EMPTY_TL, note: EMPTY_TL, items: [] };
    case "featuredProducts":
      return { heading: EMPTY_TL, sub: EMPTY_TL, limit: 6 };
    case "categoryGrid":
      return { heading: EMPTY_TL, sub: EMPTY_TL };
    case "methodTeaser":
    case "ctaBanner":
      return { heading: EMPTY_TL, body: EMPTY_TL, cta: EMPTY_LINK };
    case "richText":
      return { eyebrow: EMPTY_TL, heading: EMPTY_TL, body: EMPTY_TL };
    case "accordion":
      return { heading: EMPTY_TL, items: [] };
    case "imageText":
      return {
        heading: EMPTY_TL,
        body: EMPTY_TL,
        image: "",
        imageAlt: EMPTY_TL,
        side: "left",
        cta: EMPTY_LINK,
      };
    case "advisory":
      return { dark: false };
  }
}

/** A new section of this type, with everything empty but valid. */
export function blankSection(type: SectionType): unknown {
  return SECTION_SCHEMAS[type].parse(defaultsFor(type));
}

/** Validates one section's data against its own schema. The database stores it
 *  as Mixed, so this registry is the only thing that knows the shape. */
export function parseSection(type: string, data: unknown) {
  if (!(SECTION_TYPES as readonly string[]).includes(type)) {
    return { ok: false as const, error: `Unknown section type: ${type}` };
  }
  const parsed = SECTION_SCHEMAS[type as SectionType].safeParse(data);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid section" };
  }
  return { ok: true as const, data: parsed.data as Record<string, unknown> };
}
