"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMessage, setMessageStatus } from "@/server/actions/messages";
import type { ActionState } from "@/lib/validation/shared";

export type InboxMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: "new" | "read" | "archived";
  locale: string;
  createdAt: string;
};

/** The contact inbox.
 *
 *  Reading a message marks it read, because an inbox where that needs a
 *  separate click is an inbox where everything stays bold forever. Replies go
 *  by email — building a second inbox nobody checks would be worse than using
 *  the one they already do.
 */
export function MessageInbox({
  messages,
  canWrite,
}: {
  messages: InboxMessage[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const run = (action: () => Promise<ActionState>) =>
    start(async () => {
      const result = await action();
      setState(result);
      if (result.ok) router.refresh();
    });

  const expand = (message: InboxMessage) => {
    const next = open === message.id ? null : message.id;
    setOpen(next);
    if (next && message.status === "new" && canWrite) {
      run(() => setMessageStatus(message.id, "read"));
    }
  };

  if (messages.length === 0) return <div className="admin-empty">Nothing here.</div>;

  return (
    <>
      {state.error ? (
        <p className="auth-card__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="cart-lines">
        {messages.map((message) => (
          <article
            className={`admin-card${message.status === "new" ? " admin-card--unread" : ""}`}
            key={message.id}
          >
            <button
              type="button"
              className="admin-message__head"
              onClick={() => expand(message)}
              aria-expanded={open === message.id}
            >
              <span>
                <span className="admin-table__title">
                  {message.subject || message.message.slice(0, 60)}
                </span>
                <span className="admin-table__meta">
                  {message.name} · {message.email}
                  {message.phone ? ` · ${message.phone}` : ""} ·{" "}
                  {new Date(message.createdAt).toLocaleDateString("en-AE")}
                </span>
              </span>
              {message.status === "new" ? <span className="admin-chip admin-chip--warn">New</span> : null}
            </button>

            {open === message.id ? (
              <>
                <p style={{ marginTop: ".9rem", whiteSpace: "pre-line" }}>{message.message}</p>
                <div className="admin-table__tools" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
                  <a className="link-plain" href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject || "Your message")}`}>
                    Reply by email
                  </a>
                  {canWrite ? (
                    <>
                      <button
                        className="link-plain"
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            setMessageStatus(message.id, message.status === "archived" ? "read" : "archived"),
                          )
                        }
                      >
                        {message.status === "archived" ? "Move to inbox" : "Archive"}
                      </button>
                      <button
                        className="link-plain"
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => deleteMessage(message.id))}
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
