"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, saveCategory } from "@/server/actions/categories";
import type { ActionState } from "@/lib/validation/shared";
import { BilingualField, TextField, Toggle, emptyTL, type TL } from "./fields/Fields";

/** Categories are few and shallow, so they are edited in place rather than on
 *  their own pages — the whole shelf list fits on one screen and reordering is
 *  easier when you can see everything at once. */

export type CategoryRow = {
  id: string;
  slug: string;
  name: TL;
  note: TL;
  description: TL;
  order: number;
  published: boolean;
  productCount: number;
};

type Draft = {
  slug: string;
  name: TL;
  note: TL;
  description: TL;
  order: string;
  published: boolean;
};

const blank = (): Draft => ({
  slug: "",
  name: emptyTL(),
  note: emptyTL(),
  description: emptyTL(),
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

  const startNew = () => {
    setEditing("new");
    setDraft(blank());
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
          <button className="btn btn--brand btn--sm" type="button" onClick={startNew}>
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
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <span className="admin-table__title">{category.name.en}</span>
                    <span className="admin-table__meta">
                      {category.name.ar || "no Arabic"} · order {category.order}
                    </span>
                  </td>
                  <td className="admin-table__mono">{category.slug}</td>
                  <td>{category.productCount}</td>
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
                        <button
                          className="link-plain"
                          type="button"
                          disabled={pending || category.productCount > 0}
                          title={
                            category.productCount > 0
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
