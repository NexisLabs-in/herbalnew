"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { archiveProduct, restoreProduct } from "@/server/actions/products";

/** Row-level actions in the product table.
 *
 *  Archive rather than delete: orders keep a snapshot of what was bought, but
 *  reviews, enquiries and reports all still point at the product row, and
 *  deleting it turns those into dangling references.
 */
export function ProductRowActions({
  productId,
  status,
}: {
  productId: string;
  status: "draft" | "published" | "archived";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ error?: string }>) =>
    start(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else router.refresh();
    });

  return (
    <div className="admin-table__tools">
      {error ? <span className="field__error">{error}</span> : null}
      <Link className="link-plain" href={`/admin/products/${productId}`}>
        Edit
      </Link>
      {status === "archived" ? (
        <button className="link-plain" type="button" disabled={pending} onClick={() => run(() => restoreProduct(productId))}>
          Restore
        </button>
      ) : (
        <button className="link-plain" type="button" disabled={pending} onClick={() => run(() => archiveProduct(productId))}>
          Archive
        </button>
      )}
    </div>
  );
}
