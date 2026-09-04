"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PRICING_MODES, PRODUCT_FORMS, PRODUCT_STATUSES } from "@/lib/models/enums";
import { saveProduct } from "@/server/actions/products";
import type { ActionState } from "@/lib/validation/shared";
import {
  BilingualField,
  BilingualList,
  Fieldset,
  SelectField,
  TextField,
  Toggle,
  emptyTL,
  type TL,
} from "./fields/Fields";
import { ImageManager, type ProductImage } from "./fields/ImageManager";

/** The product editor.
 *
 *  One state object, serialised to JSON and parsed once on the server by a Zod
 *  schema. Nested arrays — preparation steps, cautions, images — flatten badly
 *  into `safety[cautions][0][en]` form fields, and every value arriving as a
 *  string means coercing types by hand at the boundary. This way the shape the
 *  form holds is the shape the server validates.
 */

export type ProductFormValue = {
  slug: string;
  sku: string;
  name: TL;
  summary: TL;
  categoryId: string;
  form: (typeof PRODUCT_FORMS)[number];
  formLabel: TL;
  pricingMode: (typeof PRICING_MODES)[number];
  price: string;
  permanentDiscount: { type: "percent" | "amount"; value: string } | null;
  trackInventory: boolean;
  stock: string;
  composition: TL;
  chemistryEffects: TL;
  netQuantity: TL;
  batch: TL;
  shelfLifeMonths: string;
  storage: TL;
  directions: { steps: { detail: TL; measure: string }[]; frequency: TL; maximum: TL } | null;
  safety: { targetGroup: TL; cautions: TL[]; seekAdvice: TL[] };
  images: ProductImage[];
  featured: boolean;
  featuredOrder: string;
  status: (typeof PRODUCT_STATUSES)[number];
  seo: { title: TL; description: TL };
};

export const blankProduct = (): ProductFormValue => ({
  slug: "",
  sku: "",
  name: emptyTL(),
  summary: emptyTL(),
  categoryId: "",
  form: "oil",
  formLabel: emptyTL(),
  pricingMode: "fixed",
  price: "",
  permanentDiscount: null,
  trackInventory: true,
  stock: "0",
  composition: emptyTL(),
  chemistryEffects: emptyTL(),
  netQuantity: emptyTL(),
  batch: emptyTL(),
  shelfLifeMonths: "",
  storage: emptyTL(),
  directions: null,
  safety: { targetGroup: emptyTL(), cautions: [], seekAdvice: [] },
  images: [],
  featured: false,
  featuredOrder: "0",
  status: "draft",
  seo: { title: emptyTL(), description: emptyTL() },
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export function ProductForm({
  productId,
  initial,
  categories,
  lowStockThreshold,
}: {
  productId: string | null;
  /** Omitted when creating. `blankProduct` lives in this client module and
   *  cannot be called from a server component, so the empty form is built
   *  here rather than passed in. */
  initial?: ProductFormValue;
  categories: { id: string; name: string }[];
  lowStockThreshold: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ProductFormValue>(() => initial ?? blankProduct());
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  // Slug follows the English name until the product exists. After that it is
  // left alone: changing a live URL breaks every link and search result
  // pointing at it, so that has to be a deliberate edit.
  const [slugLocked, setSlugLocked] = useState(productId !== null);

  const set = <K extends keyof ProductFormValue>(key: K, next: ProductFormValue[K]) =>
    setValue((current) => ({ ...current, [key]: next }));

  const err = (path: string) => state.fieldErrors?.[path];

  function submit() {
    setState({});
    start(async () => {
      const result = await saveProduct(productId, {
        ...value,
        stock: value.stock === "" ? 0 : value.stock,
        featuredOrder: value.featuredOrder === "" ? 0 : value.featuredOrder,
        price: value.pricingMode === "fixed" ? value.price : "",
        permanentDiscount: value.permanentDiscount
          ? {
              type: value.permanentDiscount.type,
              value:
                value.permanentDiscount.type === "percent"
                  ? Number(value.permanentDiscount.value || 0)
                  : value.permanentDiscount.value,
            }
          : null,
      });
      setState(result);
      if (result.ok) router.refresh();
    });
  }

  const requestPrice = value.pricingMode === "request";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
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

      <Fieldset legend="Identity" hint="What the product is called and where it sits in the cabinet.">
        <BilingualField
          label="Product name"
          required
          value={value.name}
          errors={{ en: err("name.en"), ar: err("name.ar") }}
          onChange={(next) => {
            set("name", next);
            if (!slugLocked) set("slug", slugify(next.en));
          }}
        />

        <div className="admin-row">
          <TextField
            label="Web address (slug)"
            required
            monospace
            value={value.slug}
            error={err("slug")}
            hint={`/shop/${value.slug || "…"}`}
            onChange={(next) => {
              setSlugLocked(true);
              set("slug", next);
            }}
          />
          <TextField
            label="SKU"
            required
            monospace
            value={value.sku}
            error={err("sku")}
            hint="Your own stock code. Appears on orders and invoices."
            onChange={(next) => set("sku", next.toUpperCase())}
          />
        </div>

        <div className="admin-row">
          <SelectField
            label="Category"
            value={value.categoryId}
            error={err("categoryId")}
            options={[
              { value: "", label: "Choose a category…" },
              ...categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
            onChange={(next) => set("categoryId", next)}
          />
          <SelectField
            label="Form"
            value={value.form}
            options={[
              { value: "oil", label: "Oil" },
              { value: "powder", label: "Powder" },
            ]}
            onChange={(next) => set("form", next)}
          />
        </div>

        <BilingualField
          label="Summary"
          multiline
          rows={3}
          value={value.summary}
          errors={{ en: err("summary.en") }}
          hint="One or two sentences. Shown on cards and under the product name."
          onChange={(next) => set("summary", next)}
        />

        <BilingualField
          label="Form label"
          value={value.formLabel}
          hint='How the form is written on the page — "Oil" / "زيت".'
          onChange={(next) => set("formLabel", next)}
        />
      </Fieldset>

      <Fieldset
        legend="Price"
        hint="A fixed price can be bought straight away. Request price shows an enquiry form instead, and you reply with a quote."
      >
        <div className="admin-row">
          <SelectField
            label="Pricing"
            value={value.pricingMode}
            options={[
              { value: "fixed", label: "Fixed price" },
              { value: "request", label: "Request price" },
            ]}
            onChange={(next) => set("pricingMode", next)}
          />
          <TextField
            label="Price"
            prefix="AED"
            value={requestPrice ? "" : value.price}
            error={err("price")}
            disabled={requestPrice}
            placeholder="0.00"
            hint={requestPrice ? "Set per enquiry, when you send a quote." : undefined}
            onChange={(next) => set("price", next)}
          />
        </div>

        <Toggle
          label="Permanent discount"
          hint="A standing reduction on this product. Leave it off and no discount is shown anywhere."
          checked={value.permanentDiscount !== null}
          disabled={requestPrice}
          onChange={(checked) =>
            set("permanentDiscount", checked ? { type: "percent", value: "10" } : null)
          }
        />

        {value.permanentDiscount ? (
          <div className="admin-row">
            <SelectField
              label="Discount type"
              value={value.permanentDiscount.type}
              options={[
                { value: "percent", label: "Percentage off" },
                { value: "amount", label: "Amount off" },
              ]}
              onChange={(next) =>
                set("permanentDiscount", { type: next, value: next === "percent" ? "10" : "5.00" })
              }
            />
            <TextField
              label={value.permanentDiscount.type === "percent" ? "Percent off" : "Amount off"}
              prefix={value.permanentDiscount.type === "percent" ? "%" : "AED"}
              value={value.permanentDiscount.value}
              error={err("permanentDiscount.value")}
              hint="A running sale on this product overrides this if it is larger. They never stack."
              onChange={(next) =>
                set("permanentDiscount", { ...value.permanentDiscount!, value: next })
              }
            />
          </div>
        ) : null}
      </Fieldset>

      <Fieldset legend="Stock" hint={`Customers see "Only X left" at or below ${lowStockThreshold}, and you are emailed when it drops that far.`}>
        <Toggle
          label="Track stock for this product"
          hint="Turn off for something you always have — stock is then ignored at checkout."
          checked={value.trackInventory}
          onChange={(checked) => set("trackInventory", checked)}
        />
        <div className="admin-row">
          <TextField
            label="Units in stock"
            type="number"
            value={value.stock}
            error={err("stock")}
            disabled={!value.trackInventory}
            hint="For corrections with a reason recorded, use the Inventory screen."
            onChange={(next) => set("stock", next)}
          />
          <TextField
            label="Shelf life (months)"
            type="number"
            value={value.shelfLifeMonths}
            error={err("shelfLifeMonths")}
            onChange={(next) => set("shelfLifeMonths", next)}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Images">
        <ImageManager
          images={value.images}
          error={err("images")}
          onChange={(next) => set("images", next)}
        />
      </Fieldset>

      <Fieldset
        legend="The formula"
        hint="Composition, effects and preparation. Leave anything unconfirmed empty — the page shows an 'awaiting confirmation' state rather than inventing it."
      >
        <BilingualField
          label="Composition"
          multiline
          value={value.composition}
          onChange={(next) => set("composition", next)}
        />
        <BilingualField
          label="Chemistry & physiological effects"
          multiline
          value={value.chemistryEffects}
          onChange={(next) => set("chemistryEffects", next)}
        />
        <div className="admin-row">
          <BilingualField
            label="Net quantity"
            value={value.netQuantity}
            onChange={(next) => set("netQuantity", next)}
          />
          <BilingualField label="Batch" value={value.batch} onChange={(next) => set("batch", next)} />
        </div>
        <BilingualField
          label="Storage"
          multiline
          rows={2}
          value={value.storage}
          onChange={(next) => set("storage", next)}
        />
      </Fieldset>

      <Fieldset
        legend="Directions for use"
        hint="Dosage is medical instruction. If the client has not confirmed it, leave directions off entirely."
      >
        <Toggle
          label="This product has confirmed directions"
          checked={value.directions !== null}
          onChange={(checked) =>
            set(
              "directions",
              checked ? { steps: [{ detail: emptyTL(), measure: "" }], frequency: emptyTL(), maximum: emptyTL() } : null,
            )
          }
        />

        {value.directions ? (
          <>
            <div className="admin-list">
              <div className="admin-bilingual__head">
                <span className="field__label">Preparation steps</span>
                <span className="admin-list__count">{value.directions.steps.length}</span>
              </div>

              {value.directions.steps.map((step, index) => (
                <div className="admin-list__row" key={index}>
                  <div className="admin-list__inputs">
                    <input
                      className="field__input"
                      placeholder={`Step ${index + 1} — English`}
                      value={step.detail.en}
                      onChange={(event) =>
                        set("directions", {
                          ...value.directions!,
                          steps: value.directions!.steps.map((s, i) =>
                            i === index ? { ...s, detail: { ...s.detail, en: event.target.value } } : s,
                          ),
                        })
                      }
                    />
                    <input
                      className="field__input"
                      placeholder="العربية"
                      dir="rtl"
                      lang="ar"
                      value={step.detail.ar}
                      onChange={(event) =>
                        set("directions", {
                          ...value.directions!,
                          steps: value.directions!.steps.map((s, i) =>
                            i === index ? { ...s, detail: { ...s.detail, ar: event.target.value } } : s,
                          ),
                        })
                      }
                    />
                    <input
                      className="field__input field__input--sm"
                      placeholder="Measure — 10 drops, 30 min"
                      value={step.measure}
                      onChange={(event) =>
                        set("directions", {
                          ...value.directions!,
                          steps: value.directions!.steps.map((s, i) =>
                            i === index ? { ...s, measure: event.target.value } : s,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="admin-list__tools">
                    <button
                      type="button"
                      className="admin-icon-btn admin-icon-btn--danger"
                      aria-label="Remove step"
                      onClick={() =>
                        set("directions", {
                          ...value.directions!,
                          steps: value.directions!.steps.filter((_, i) => i !== index),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() =>
                  set("directions", {
                    ...value.directions!,
                    steps: [...value.directions!.steps, { detail: emptyTL(), measure: "" }],
                  })
                }
              >
                Add a step
              </button>
            </div>

            <div className="admin-row">
              <BilingualField
                label="Frequency"
                value={value.directions.frequency}
                onChange={(next) => set("directions", { ...value.directions!, frequency: next })}
              />
              <BilingualField
                label="Maximum"
                value={value.directions.maximum}
                onChange={(next) => set("directions", { ...value.directions!, maximum: next })}
              />
            </div>
          </>
        ) : null}
      </Fieldset>

      <Fieldset legend="Safety" hint="Shown on the product page under the health advisory.">
        <BilingualField
          label="Who it is for"
          value={value.safety.targetGroup}
          onChange={(next) => set("safety", { ...value.safety, targetGroup: next })}
        />
        <BilingualList
          label="Cautions"
          addLabel="Add a caution"
          items={value.safety.cautions}
          onChange={(next) => set("safety", { ...value.safety, cautions: next })}
        />
        <BilingualList
          label="Should seek advice first"
          addLabel="Add a group"
          items={value.safety.seekAdvice}
          onChange={(next) => set("safety", { ...value.safety, seekAdvice: next })}
        />
      </Fieldset>

      <Fieldset legend="Publishing">
        <div className="admin-row">
          <SelectField
            label="Status"
            value={value.status}
            options={[
              { value: "draft", label: "Draft — not visible" },
              { value: "published", label: "Published — on sale" },
              { value: "archived", label: "Archived — hidden" },
            ]}
            hint="Publishing needs a summary and at least one image."
            onChange={(next) => set("status", next)}
          />
          <TextField
            label="Featured order"
            type="number"
            value={value.featuredOrder}
            hint="Lower numbers come first on the homepage."
            onChange={(next) => set("featuredOrder", next)}
          />
        </div>

        <Toggle
          label="Show in Featured products on the homepage"
          checked={value.featured}
          onChange={(checked) => set("featured", checked)}
        />

        <BilingualField
          label="SEO title"
          value={value.seo.title}
          hint="Leave empty to use the product name."
          onChange={(next) => set("seo", { ...value.seo, title: next })}
        />
        <BilingualField
          label="SEO description"
          multiline
          rows={2}
          value={value.seo.description}
          hint="Leave empty to use the summary."
          onChange={(next) => set("seo", { ...value.seo, description: next })}
        />
      </Fieldset>

      <div className="admin-formbar">
        <button className="btn btn--brand" type="submit" disabled={pending}>
          {pending ? "Saving…" : productId ? "Save changes" : "Create product"}
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          disabled={pending}
          onClick={() => router.push("/admin/products")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
