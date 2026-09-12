"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, saveCategory } from "@/server/actions/categories";
import type { ActionState } from "@/lib/validation/shared";
import { BilingualField, SelectField, TextField, Toggle, emptyTL, type TL } from "./fields/Fields";

/** Categories are few and shallow, so they stay on one list. Create and edit
 *  open a dialog so the table does not jump and the form is not off-screen
 *  when you click a row at the bottom. */

export type CategoryRow = {
  id: string;
  slug: string;
  name: TL;
  note: TL;
  description: TL;
  /** Null for a top-level category. Products sit on a child, or on a parent that has none. */
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const open = editing !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const close = () => setEditing(null);

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
      {state.error && !editing ? (
        <p className="auth-card__error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="admin-note" role="status" style={{ marginBottom: "1.25rem" }}>
          {state.notice}
        </p>
      ) : null}

      {canWrite ? (
        <p style={{ marginBottom: "1.25rem" }}>
          <button className="btn btn--brand btn--sm" type="button" onClick={() => startNew()}>
            Add category
          </button>
        </p>
      ) : null}

      <dialog
        ref={dialogRef}
        className="admin-dialog"
        aria-labelledby="category-dialog-title"
        onClose={close}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="admin-dialog__inner">
          <div className="admin-dialog__head">
            <h2 id="category-dialog-title" className="admin-dialog__title">
              {editing === "new"
                ? draft.parentId
                  ? "New subcategory"
                  : "New category"
                : "Edit category"}
            </h2>
            <button className="admin-dialog__close" type="button" onClick={close} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="admin-dialog__body">
            {state.error && editing ? (
              <p className="auth-card__error" role="alert" style={{ marginBottom: "1rem" }}>
                {state.error}
              </p>
            ) : null}

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
                hint="A top-level category with no subcategories can hold products itself. Once it has children, products sit on those children."
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
            </div>
          </div>

          <div className="admin-dialog__foot">
            <button className="btn btn--brand btn--sm" type="button" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={close}>
              Cancel
            </button>
          </div>
        </div>
      </dialog>

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
                    {category.parentId === null && category.childCount > 0 ? (
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
