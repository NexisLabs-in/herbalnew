"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cmsPagePath } from "@/lib/cms/routes";
import { savePage } from "@/server/actions/content";
import type { ActionState } from "@/lib/validation/shared";
import { BilingualField, Fieldset, TextField, Toggle, emptyTL, type TL } from "./fields/Fields";

type MethodCopy = {
  heading: TL;
  standfirst: TL;
  kicker: TL;
  traditionsHeading: TL;
  traditionsNote: TL;
  traditions: TL[];
  intro: TL;
  paragraphs: TL[];
  stepsHeading: TL;
  stepsSub: TL;
  steps: { title: TL; detail: TL }[];
  valuesHeading: TL;
  valuesSub: TL;
  values: TL[];
  cta: TL;
};

type Channel = { label: TL; href: string };

type ContactCopy = {
  company: TL;
  about: TL;
  email: string;
  hours: TL;
  address: TL;
  licence: string;
  website: string;
  country: TL;
  pendingTitle: TL;
  pendingNote: TL;
  pending: Channel[];
};

const asTL = (value: unknown): TL => {
  const record = (value ?? {}) as { en?: string; ar?: string };
  return { en: record.en ?? "", ar: record.ar ?? "" };
};

function LineList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: TL[];
  onChange: (items: TL[]) => void;
}) {
  return (
    <div className="admin-list">
      <div className="admin-bilingual__head">
        <span className="field__label">{label}</span>
        <span className="admin-list__count">{items.length}</span>
      </div>
      {items.map((item, index) => (
        <div className="admin-list__row" key={index}>
          <div className="admin-list__inputs">
            <BilingualField
              label={`Item ${index + 1}`}
              value={item}
              onChange={(next) => onChange(items.map((entry, i) => (i === index ? next : entry)))}
            />
          </div>
          <div className="admin-list__tools">
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn--danger"
              aria-label="Remove"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([...items, emptyTL()])}>
        Add line
      </button>
    </div>
  );
}

function asChannel(value: unknown): Channel {
  const record = (value ?? {}) as { en?: string; ar?: string; label?: unknown; href?: string };
  return {
    label: record.label && typeof record.label === "object" ? asTL(record.label) : asTL(record),
    href: typeof record.href === "string" ? record.href : "",
  };
}

function ChannelList({
  items,
  onChange,
}: {
  items: Channel[];
  onChange: (items: Channel[]) => void;
}) {
  return (
    <div className="admin-list">
      <div className="admin-bilingual__head">
        <span className="field__label">Channels</span>
        <span className="admin-list__count">{items.length}</span>
      </div>
      {items.map((item, index) => (
        <div className="admin-list__row" key={index}>
          <div className="admin-list__inputs">
            <BilingualField
              label="Name"
              value={item.label}
              onChange={(label) => onChange(items.map((entry, i) => (i === index ? { ...entry, label } : entry)))}
            />
            <TextField
              label="Link"
              value={item.href}
              hint="Optional. https://t.me/…, https://wa.me/…, or a phone link."
              onChange={(href) => onChange(items.map((entry, i) => (i === index ? { ...entry, href } : entry)))}
            />
          </div>
          <div className="admin-list__tools">
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn--danger"
              aria-label="Remove"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onChange([...items, { label: emptyTL(), href: "" }])}
      >
        Add channel
      </button>
    </div>
  );
}

export function CopyEditor({
  slug,
  title,
  seo,
  published,
  data,
}: {
  slug: "method" | "contact";
  title: TL;
  seo: { title: TL; description: TL };
  published: boolean;
  data: Record<string, unknown>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  const [pageTitle, setPageTitle] = useState(title);
  const [pageSeo, setSeo] = useState(seo);
  const [live, setPublished] = useState(published);
  const [method, setMethod] = useState<MethodCopy>(() => ({
    heading: asTL(data.heading),
    standfirst: asTL(data.standfirst),
    kicker: asTL(data.kicker),
    traditionsHeading: asTL(data.traditionsHeading),
    traditionsNote: asTL(data.traditionsNote),
    traditions: Array.isArray(data.traditions) ? data.traditions.map(asTL) : [],
    intro: asTL(data.intro),
    paragraphs: Array.isArray(data.paragraphs) ? data.paragraphs.map(asTL) : [],
    stepsHeading: asTL(data.stepsHeading),
    stepsSub: asTL(data.stepsSub),
    steps: Array.isArray(data.steps)
      ? data.steps.map((step) => {
          const record = step as { title?: unknown; detail?: unknown };
          return { title: asTL(record.title), detail: asTL(record.detail) };
        })
      : [],
    valuesHeading: asTL(data.valuesHeading),
    valuesSub: asTL(data.valuesSub),
    values: Array.isArray(data.values) ? data.values.map(asTL) : [],
    cta: asTL(data.cta),
  }));
  const [contact, setContact] = useState<ContactCopy>(() => ({
    company: asTL(data.company),
    about: asTL(data.about),
    email: typeof data.email === "string" ? data.email : "",
    hours: asTL(data.hours),
    address: asTL(data.address),
    licence: typeof data.licence === "string" ? data.licence : "",
    website: typeof data.website === "string" ? data.website : "",
    country: asTL(data.country),
    pendingTitle: asTL(data.pendingTitle),
    pendingNote: asTL(data.pendingNote),
    pending: Array.isArray(data.pending) ? data.pending.map(asChannel) : [],
  }));

  const save = () =>
    start(async () => {
      const result = await savePage(slug, {
        title: pageTitle,
        seo: pageSeo,
        published: live,
        sections: [
          {
            type: slug === "method" ? "methodCopy" : "contactCopy",
            visible: true,
            data: slug === "method" ? method : contact,
          },
        ],
      });
      setState(result);
      if (result.ok) router.refresh();
    });

  return (
    <div>
      <Fieldset legend="Page" hint="The words on the page. The layout stays as it is.">
        {slug === "contact" ? (
          <BilingualField label="Page heading" required value={pageTitle} onChange={setPageTitle} />
        ) : null}
        <BilingualField
          label="SEO title"
          value={pageSeo.title}
          hint="Leave empty to use the page heading."
          onChange={(next) => setSeo({ ...pageSeo, title: next })}
        />
        <BilingualField
          label="SEO description"
          multiline
          rows={2}
          value={pageSeo.description}
          onChange={(next) => setSeo({ ...pageSeo, description: next })}
        />
        <Toggle label="Published" checked={live} onChange={setPublished} />
      </Fieldset>

      {slug === "method" ? (
        <>
          <Fieldset legend="Opening">
            <BilingualField label="Kicker" value={method.kicker} onChange={(kicker) => setMethod({ ...method, kicker })} />
            <BilingualField
              label="Page heading"
              required
              value={method.heading}
              onChange={(heading) => setMethod({ ...method, heading })}
            />
            <BilingualField
              label="Standfirst"
              multiline
              value={method.standfirst}
              onChange={(standfirst) => setMethod({ ...method, standfirst })}
            />
          </Fieldset>
          <Fieldset legend="Traditions">
            <BilingualField
              label="Heading"
              value={method.traditionsHeading}
              onChange={(traditionsHeading) => setMethod({ ...method, traditionsHeading })}
            />
            <LineList
              label="Traditions"
              items={method.traditions}
              onChange={(traditions) => setMethod({ ...method, traditions })}
            />
            <BilingualField
              label="Note"
              multiline
              value={method.traditionsNote}
              onChange={(traditionsNote) => setMethod({ ...method, traditionsNote })}
            />
          </Fieldset>
          <Fieldset legend="Introduction">
            <BilingualField label="Lead" multiline rows={4} value={method.intro} onChange={(intro) => setMethod({ ...method, intro })} />
            <LineList
              label="Paragraphs"
              items={method.paragraphs}
              onChange={(paragraphs) => setMethod({ ...method, paragraphs })}
            />
          </Fieldset>
          <Fieldset legend="Steps">
            <BilingualField
              label="Heading"
              value={method.stepsHeading}
              onChange={(stepsHeading) => setMethod({ ...method, stepsHeading })}
            />
            <BilingualField
              label="Introduction"
              multiline
              value={method.stepsSub}
              onChange={(stepsSub) => setMethod({ ...method, stepsSub })}
            />
            {method.steps.map((step, index) => (
              <div key={index} className="admin-fieldset" style={{ margin: 0 }}>
                <div className="admin-fieldset__body">
                  <BilingualField
                    label={`Step ${index + 1} title`}
                    value={step.title}
                    onChange={(title) =>
                      setMethod({
                        ...method,
                        steps: method.steps.map((entry, i) => (i === index ? { ...entry, title } : entry)),
                      })
                    }
                  />
                  <BilingualField
                    label="Detail"
                    multiline
                    value={step.detail}
                    onChange={(detail) =>
                      setMethod({
                        ...method,
                        steps: method.steps.map((entry, i) => (i === index ? { ...entry, detail } : entry)),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </Fieldset>
          <Fieldset legend="Values">
            <BilingualField
              label="Kicker"
              value={method.valuesHeading}
              onChange={(valuesHeading) => setMethod({ ...method, valuesHeading })}
            />
            <BilingualField
              label="Heading"
              value={method.valuesSub}
              onChange={(valuesSub) => setMethod({ ...method, valuesSub })}
            />
            <LineList label="Values" items={method.values} onChange={(values) => setMethod({ ...method, values })} />
          </Fieldset>
          <Fieldset legend="Button">
            <BilingualField label="Button text" value={method.cta} onChange={(cta) => setMethod({ ...method, cta })} />
          </Fieldset>
        </>
      ) : (
        <>
        <Fieldset legend="Contact details" hint="The form and health notice stay on the page.">
          <BilingualField label="Company" value={contact.company} onChange={(company) => setContact({ ...contact, company })} />
          <BilingualField label="Introduction" multiline rows={4} value={contact.about} onChange={(about) => setContact({ ...contact, about })} />
          <TextField label="Email" value={contact.email} onChange={(email) => setContact({ ...contact, email })} />
          <BilingualField label="Hours" value={contact.hours} onChange={(hours) => setContact({ ...contact, hours })} />
          <BilingualField
            label="Address"
            multiline
            value={contact.address}
            onChange={(address) => setContact({ ...contact, address })}
          />
          <TextField label="Trade licence" value={contact.licence} onChange={(licence) => setContact({ ...contact, licence })} />
          <TextField label="Website" value={contact.website} onChange={(website) => setContact({ ...contact, website })} />
          <BilingualField label="Country" value={contact.country} onChange={(country) => setContact({ ...contact, country })} />
        </Fieldset>
        <Fieldset legend="Coming soon" hint="Each channel can have a link — Telegram, WhatsApp, or any URL. Leave the link empty to show the name only.">
          <BilingualField
            label="Heading"
            value={contact.pendingTitle}
            onChange={(pendingTitle) => setContact({ ...contact, pendingTitle })}
          />
          <BilingualField
            label="Note under each channel"
            value={contact.pendingNote}
            onChange={(pendingNote) => setContact({ ...contact, pendingNote })}
          />
          <ChannelList
            items={contact.pending}
            onChange={(pending) => setContact({ ...contact, pending })}
          />
        </Fieldset>
        </>
      )}

      <div className="admin-formbar">
        <button className="btn btn--brand" type="button" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save page"}
        </button>
        <a className="btn btn--ghost" href={cmsPagePath(slug)} target="_blank" rel="noreferrer">
          View page
        </a>
        {state.error ? (
          <p className="admin-formbar__msg admin-formbar__msg--error" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.notice && !state.error ? (
          <p className="admin-formbar__msg admin-formbar__msg--ok" role="status">
            {state.notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
