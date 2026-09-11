"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ShopFilterLinkProps = Omit<ComponentProps<typeof Link>, "scroll"> & {
  children: ReactNode;
};

/** Shop filter link with instant pending feedback while the server re-renders. */
export function ShopFilterLink({ children, className, ...props }: ShopFilterLinkProps) {
  return (
    <Link {...props} scroll={false} className={className}>
      <ShopFilterLinkInner>{children}</ShopFilterLinkInner>
    </Link>
  );
}

function ShopFilterLinkInner({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span className={pending ? "shop-filter-link is-pending" : "shop-filter-link"} aria-busy={pending}>
      {children}
    </span>
  );
}
