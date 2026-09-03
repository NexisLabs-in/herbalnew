"use client";

import Image from "next/image";
import { useState } from "react";

export type GalleryView = { src: string; alt: string; photo?: boolean };

export function Gallery({ views, label }: { views: GalleryView[]; label: string }) {
  const [active, setActive] = useState(0);
  const current = views[active];

  return (
    <div className="pdp__gallery">
      <div className={`pdp__stage${current.photo ? " pdp__stage--photo" : ""}`}>
        <Image
          key={current.src}
          className={`pdp__img${current.photo ? " pdp__img--photo" : ""}`}
          src={current.src}
          alt={current.alt}
          width={current.photo ? 900 : 400}
          height={current.photo ? 900 : 660}
          priority
        />
      </div>
      {views.length > 1 ? (
      <div className="pdp__thumbs" role="tablist" aria-label={label}>
        {views.map((view, i) => (
          <button
            key={view.src}
            className={`pdp__thumb${i === active ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={view.alt}
            onClick={() => setActive(i)}
          >
            <Image src={view.src} alt="" width={74} height={74} />
          </button>
        ))}
      </div>
      ) : null}
    </div>
  );
}
