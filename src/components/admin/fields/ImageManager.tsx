"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { IMAGE_KINDS } from "@/lib/models/enums";
import { emptyTL, type TL } from "./Fields";

/** Product images: upload, reorder, label, choose the primary one.
 *
 *  Upload is two steps — ask the server for a target, then PUT the bytes there.
 *  That is what a presigned S3 upload needs, and the local driver mimics the
 *  same shape, so moving to the client's bucket changes an env var and nothing
 *  in this component.
 *
 *  Files are held here until the form is saved; nothing is written to the
 *  product until the admin saves it.
 */

export type ProductImage = {
  key: string;
  url: string;
  alt: TL;
  isPrimary: boolean;
  kind: (typeof IMAGE_KINDS)[number];
};

const KIND_LABELS: Record<(typeof IMAGE_KINDS)[number], string> = {
  photo: "Photograph",
  pack: "Packshot",
  carton: "Carton",
  plate: "Botanical plate",
};

export function ImageManager({
  images,
  onChange,
  prefix = "products",
  error,
}: {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  prefix?: "products" | "categories" | "content";
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function upload(files: FileList) {
    setBusy(true);
    setProblem(null);
    const added: ProductImage[] = [];

    for (const file of Array.from(files)) {
      try {
        const presign = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prefix,
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });

        if (!presign.ok) {
          const body = await presign.json().catch(() => ({}));
          throw new Error(body.error ?? `${file.name} could not be prepared for upload.`);
        }

        const target = await presign.json();

        const put = await fetch(target.uploadUrl, {
          method: "PUT",
          headers: target.headers,
          body: file,
        });
        if (!put.ok) throw new Error(`${file.name} did not upload.`);

        added.push({
          key: target.key,
          url: target.url,
          alt: emptyTL(),
          // The first image on a product with none becomes the primary one, so
          // there is always something to show on a card.
          isPrimary: images.length === 0 && added.length === 0,
          kind: "photo",
        });
      } catch (uploadError) {
        setProblem(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      }
    }

    if (added.length) onChange([...images, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const update = (index: number, next: Partial<ProductImage>) =>
    onChange(images.map((image, i) => (i === index ? { ...image, ...next } : image)));

  const makePrimary = (index: number) =>
    onChange(images.map((image, i) => ({ ...image, isPrimary: i === index })));

  const remove = (index: number) => {
    const remaining = images.filter((_, i) => i !== index);
    // Never leave a product with images but no primary one.
    if (remaining.length && !remaining.some((image) => image.isPrimary)) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    onChange(remaining);
  };

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  };

  return (
    <div>
      {error ? <p className="field__error" style={{ marginBottom: ".75rem" }}>{error}</p> : null}
      {problem ? <p className="auth-card__error">{problem}</p> : null}

      <div className="admin-images">
        {images.map((image, index) => (
          <div className={`admin-image${image.isPrimary ? " admin-image--primary" : ""}`} key={image.key}>
            <div className="admin-image__frame">
              {/* Unoptimised: these come from a bucket or the local uploads
                  directory and are not known to next.config's image domains. */}
              <Image src={image.url} alt={image.alt.en || "Product image"} fill sizes="180px" unoptimized />
            </div>

            <div className="admin-image__body">
              <select
                className="field__input field__input--sm"
                value={image.kind}
                onChange={(event) => update(index, { kind: event.target.value as ProductImage["kind"] })}
              >
                {IMAGE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </select>

              <input
                className="field__input field__input--sm"
                placeholder="Alt text (English)"
                value={image.alt.en}
                onChange={(event) => update(index, { alt: { ...image.alt, en: event.target.value } })}
              />
              <input
                className="field__input field__input--sm"
                placeholder="نص بديل"
                dir="rtl"
                lang="ar"
                value={image.alt.ar}
                onChange={(event) => update(index, { alt: { ...image.alt, ar: event.target.value } })}
              />

              <div className="admin-image__tools">
                <button
                  type="button"
                  className="link-plain"
                  onClick={() => makePrimary(index)}
                  disabled={image.isPrimary}
                >
                  {image.isPrimary ? "Main image" : "Make main"}
                </button>
                <span className="admin-image__spacer" />
                <button type="button" className="admin-icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move earlier">
                  ←
                </button>
                <button
                  type="button"
                  className="admin-icon-btn"
                  onClick={() => move(index, 1)}
                  disabled={index === images.length - 1}
                  aria-label="Move later"
                >
                  →
                </button>
                <button type="button" className="admin-icon-btn admin-icon-btn--danger" onClick={() => remove(index)} aria-label="Remove">
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: images.length ? "1rem" : 0 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
          multiple
          hidden
          onChange={(event) => event.target.files && upload(event.target.files)}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : images.length ? "Add more images" : "Upload images"}
        </button>
        <p className="field__hint" style={{ marginTop: ".5rem" }}>
          JPEG, PNG, WebP, AVIF or SVG. Up to 5 MB each. The main image is the one used on cards.
        </p>
      </div>
    </div>
  );
}
