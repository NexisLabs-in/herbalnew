/** Admin product-form options: every shelf that may actually hold a product.
 *
 *  A parent with children is only a grouping — its children are the options.
 *  A parent with no children (Reproductive & Hormone Health) is itself the
 *  option. Inventing a dummy child to satisfy "products only on subcategories"
 *  is what put Fertility & Vitality on the site; do not do that again. */

export function productCategoryGroups(
  categories: { _id: unknown; name: { en: string }; parentId: unknown }[],
): { parent: string; children: { id: string; name: string }[] }[] {
  return categories
    .filter((category) => category.parentId == null)
    .map((parent) => {
      const id = String(parent._id);
      const children = categories
        .filter((category) => String(category.parentId ?? "") === id)
        .map((child) => ({ id: String(child._id), name: child.name.en }));
      return {
        parent: parent.name.en,
        children: children.length ? children : [{ id, name: parent.name.en }],
      };
    });
}
