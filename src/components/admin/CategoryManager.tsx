"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, saveCategory } from "@/server/actions/categories";
import type { ActionState } from "@/lib/validation/shared";
import { BilingualField, SelectField, TextField, Toggle, emptyTL, type TL } from "./fields/Fields";

/** Categories are few and shallow, so they are edited in place rather than on
 *  their own pages — the whole shelf list fits on one screen and reordering is
 *  easier when you can see everything at once. */

export type CategoryRow = {
  id: string;
  slug: string;
  name: TL;
  note: TL;
  description: TL;
  /** Null for a top-level category. Products only sit on subcategories. */
  parentId: string | null;
  order: number;
  published: boolean;
  productCount: number;
  childCount: number;
};

type Draft = {
  slug: string;
  name: TL;
  note: TL;
  description: TL;
  parentId: string;
  order: string;
  published: boolean;
};

const blank = (parentId = ""): Draft => ({
  slug: "",
  name: emptyTL(),
  note: emptyTL(),
  description: emptyTL(),
  parentId,
  order: "0",
  published: true,
});

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export function CategoryManager({
  categories,
  canWrite,
}: {
  categories: CategoryRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const startNew = (parentId = "") => {
    setEditing("new");
    setDraft(blank(parentId));
    setState({});
  };

  const startEdit = (category: CategoryRow) => {
    setEditing(category.id);
    setState({});
    setDraft({
      slug: category.slug,
      name: category.name,
      note: category.note,
      description: category.description,
      parentId: category.parentId ?? "",
      order: String(category.order),
      published: category.published,
    });
  };

  const save = () =>
    start(async () => {
      const result = await saveCategory(editing === "new" ? null : editing, {
        ...draft,
        order: draft.order === "" ? 0 : draft.order,
      });
      setState(result);
      if (result.ok) {
        setEditing(null);
        router.refresh();
      }
    });

  const remove = (id: string) =>
    start(async () => {
      const result = await deleteCategory(id);
      setState(result);
      if (result.ok) router.refresh();
    });

  const err = (path: string) => state.fieldErrors?.[path];

  /** Parents in order, each followed by its own subcategories, so the table
   *  reads as the tree it is. */
  const ordered = categories
    .filter((category) => category.parentId === null)
    .flatMap((parent) => [parent, ...categories.filter((child) => child.parentId === parent.id)]);

  return (
    <>
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

      {editing ? (
        <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="admin-fieldset__legend" style={{ marginBottom: "1rem" }}>
            {editing === "new" ? "New category" : "Edit category"}
          </h2>

          <div className="stack" style={{ ["--stack" as string]: "1.1rem" }}>
            <BilingualField
              label="Name"
              required
              value={draft.name}
              errors={{ en: err("name.en") }}
              onChange={(next) =>
                setDraft((current) => ({
                  ...current,
                  name: next,
                  slug: editing === "new" ? slugify(next.en) : current.slug,
                }))
              }
            />

            <SelectField
              label="Sits under"
              value={draft.parentId}
              error={err("parentId")}
              hint="Products can only be added to a subcategory. A top-level category groups the shelves beneath it."
              options={[
                { value: "", label: "Top level — a grouping" },
                ...categories
                  .filter((category) => category.parentId === null && category.id !== editing)
                  .map((category) => ({ value: category.id, label: category.name.en })),
              ]}
              onChange={(next) => setDraft((current) => ({ ...current, parentId: next }))}
            />

            <div className="admin-row">
              <TextField
                label="Web address (slug)"
                monospace
                required
                value={draft.slug}
                error={err("slug")}
                hint={`/shop?category=${draft.slug || "…"}`}
                onChange={(next) => setDraft((current) => ({ ...current, slug: next }))}
              />
              <TextField
                label="Order"
                type="number"
                value={draft.order}
                hint="Lower numbers appear first in the filter."
                onChange={(next) => setDraft((current) => ({ ...current, order: next }))}
              />
            </div>

            <BilingualField
              label="Note"
              value={draft.note}
              hint="A short line shown beside the shelf name."
              onChange={(next) => setDraft((current) => ({ ...current, note: next }))}
            />

            <BilingualField
              label="Description"
              multiline
              rows={3}
              value={draft.description}
              onChange={(next) => setDraft((current) => ({ ...current, description: next }))}
            />

            <Toggle
              label="Show this category on the storefront"
              checked={draft.published}
              onChange={(checked) => setDraft((current) => ({ ...current, published: checked }))}
            />

            <div className="admin-formbar" style={{ marginTop: 0 }}>
              <button className="btn btn--brand btn--sm" type="button" disabled={pending} onClick={save}>
                {pending ? "Saving…" : "Save"}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : canWrite ? (
        <p style={{ marginBottom: "1.25rem" }}>
          <button className="btn btn--brand btn--sm" type="button" onClick={() => startNew()}>
            Add category
          </button>
        </p>
      ) : null}

      {categories.length === 0 ? (
        <div className="admin-empty">No categories yet.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Visible</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {ordered.map((category) => (
                <tr key={category.id}>
                  <td>
                    <span
                      className="admin-table__title"
                      style={category.parentId ? { paddingInlineStart: "1.4rem", fontWeight: 400 } : undefined}
                    >
                      {category.parentId ? "\u2514 " : ""}
                      {category.name.en}
                    </span>
                    <span className="admin-table__meta" style={category.parentId ? { paddingInlineStart: "1.4rem" } : undefined}>
                      {category.name.ar || "no Arabic"} · order {category.order}
                      {category.parentId === null ? ` · ${category.childCount} subcategor${category.childCount === 1 ? "y" : "ies"}` : ""}
                    </span>
                  </td>
                  <td className="admin-table__mono">{category.slug}</td>
                  <td>
                    {category.parentId === null ? (
                      <span className="admin-table__meta">—</span>
                    ) : (
                      category.productCount
                    )}
                  </td>
                  <td>
                    {category.published ? (
                      <span className="admin-chip admin-chip--published">Visible</span>
                    ) : (
                      <span className="admin-chip">Hidden</span>
                    )}
                  </td>
                  <td className="admin-table__actions">
                    {canWrite ? (
                      <div className="admin-table__tools">
                        <button className="link-plain" type="button" onClick={() => startEdit(category)}>
                          Edit
                        </button>
                        {category.parentId === null ? (
                          <button className="link-plain" type="button" onClick={() => startNew(category.id)}>
                            Add subcategory
                          </button>
                        ) : null}
                        <button
                          className="link-plain"
                          type="button"
                          disabled={pending || category.productCount > 0 || category.childCount > 0}
                          title={
                            category.childCount > 0
                              ? "Delete or move its subcategories first"
                              : category.productCount > 0
                                ? "Move its products to another category first"
                                : undefined
                          }
                          onClick={() => remove(category.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
