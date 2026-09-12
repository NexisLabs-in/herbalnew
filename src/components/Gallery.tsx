"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { UI } from "@/content/brand";
import { dir, t, type Locale } from "@/lib/i18n";

export type GalleryView = { src: string; alt: string; photo?: boolean };

/** Uploaded images come from the bucket, which is not a configured optimiser
 *  domain; the checked-in /img/* packshots still go through it. */
const optimisable = (src: string) => src.startsWith("/img/");

export function Gallery({
  views,
  label,
  locale,
  action,
  badge,
}: {
  views: GalleryView[];
  label: string;
  locale: Locale;
  /** Rendered pinned to the top corner of the stage — the save-for-later
   *  heart, so it reads as part of the product image rather than the form. */
  action?: ReactNode;
  /** Corner mark — a sale flag opposite the heart. */
  badge?: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = views[active];
  const many = views.length > 1;

  const step = useCallback(
    (by: number) => setActive((index) => (index + by + views.length) % views.length),
    [views.length],
  );

  /** `showModal()` is imperative — it cannot be expressed as a prop, and the
   *  element has to be in the DOM before it is called. Going through state
   *  rather than calling it from the click handler keeps the dialog's own ESC
   *  and backdrop dismissals in sync with React. */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /** The backdrop covers the page but does not stop it scrolling underneath on
   *  a wheel or a touch drag. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Arrow keys follow what the reader sees, so in Arabic the right arrow moves
  // to the image on the right, which is the earlier one.
  const rtl = dir(locale) === "rtl";
  const onKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (!many) return;
    if (event.key === "ArrowRight") step(rtl ? -1 : 1);
    else if (event.key === "ArrowLeft") step(rtl ? 1 : -1);
  };

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
          unoptimized={!optimisable(current.src)}
        />

        {/* A sibling of the image, not a wrapper: the packshot keeps its
            percentage sizing against the stage, and the heart in the opposite
            corner stays out of this button rather than nesting inside it. */}
        <button
          type="button"
          className="pdp__zoom"
          onClick={() => setOpen(true)}
          aria-label={t(UI.viewFullScreen, locale)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
          </svg>
        </button>

        {badge ? <div className="pdp__sale-flag">{badge}</div> : null}
        {action ? <div className="pdp__wish">{action}</div> : null}
      </div>

      {many ? (
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
              <Image src={view.src} alt="" width={74} height={74} unoptimized={!optimisable(view.src)} />
            </button>
          ))}
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label={label}
        onClose={() => setOpen(false)}
        onKeyDown={onKeyDown}
        // A click that lands on the dialog itself is a click on the backdrop:
        // the content sits in the inner element, which stops its own clicks.
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
      >
        <div className="lightbox__inner">
          <button
            type="button"
            className="lightbox__close"
            onClick={() => setOpen(false)}
            aria-label={t(UI.closeViewer, locale)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="lightbox__stage">
            {/* Only rendered while open, so the full-size file is not fetched
                by every visitor who never opens the viewer. */}
            {open ? (
              <Image
                key={current.src}
                className="lightbox__img"
                src={current.src}
                alt={current.alt}
                // Same proportions as the stage, scaled up: the attributes set
                // the aspect ratio the browser reserves, so a packshot must not
                // be declared square.
                width={current.photo ? 1600 : 1000}
                height={current.photo ? 1600 : 1650}
                unoptimized={!optimisable(current.src)}
              />
            ) : null}
          </div>

          {many ? (
            <div className="lightbox__bar">
              <button
                type="button"
                className="lightbox__nav"
                onClick={() => step(-1)}
                aria-label={t(UI.previousImage, locale)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <p className="lightbox__count">
                {active + 1} / {views.length}
              </p>
              <button
                type="button"
                className="lightbox__nav"
                onClick={() => step(1)}
                aria-label={t(UI.nextImage, locale)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
