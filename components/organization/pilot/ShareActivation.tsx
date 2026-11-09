"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { IconBrandGoogle, IconBrandSlack, IconBrandTeams, IconCheck, IconCopy, IconMail, IconMessage, IconWorld, IconX } from "@tabler/icons-react";
import type { ActivationKind, PilotActivation } from "@/lib/enterprise-crm/pilot/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ActivationKind, string> = { post: "Social post", video: "Video", article: "Article", campaign: "Campaign", event: "Event" };

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function dueLabel(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** The note staff send each other: what, for whom, by when, the brief, and both links. */
export function staffMessage(row: PilotActivation, fanLink: string, workspaceLink: string): string {
  const names = row.athletes.length ? row.athletes.map((athlete) => athlete.name).join(", ") : row.playerName ?? "a former player";
  const due = dueLabel(row.dueOn);
  return [
    `${KIND_LABEL[row.kind]}: ${row.title}`,
    `Featuring ${names}${due ? `, due ${due}` : ""}`,
    row.brief ? `Brief: ${row.brief}` : null,
    `Fan Locker link (tracked): ${fanLink}`,
    `Open in BLTZ: ${workspaceLink}`,
  ].filter(Boolean).join("\n");
}

/** A website post built from the activation, ready to paste into the school's site editor. */
export function sitePost(row: PilotActivation, fanLink: string, schoolName: string): { headline: string; paragraphs: string[]; cta: string; html: string; text: string } {
  const name = row.athletes[0]?.name ?? row.playerName ?? "this former player";
  const paragraphs = (row.brief ? row.brief.split(/\n+/) : [`${schoolName} celebrates ${name}.`, `See ${name}'s career highlights, stats and photos on their fan Locker.`]).map((line) => line.trim()).filter(Boolean);
  const cta = `Visit ${name}'s fan Locker`;
  const html = [`<h2>${escapeHtml(row.title)}</h2>`, ...paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`), `<p><a href="${escapeHtml(fanLink)}">${escapeHtml(cta)}</a></p>`].join("\n");
  const text = [row.title, "", ...paragraphs.flatMap((line) => [line, ""]), `${cta}: ${fanLink}`].join("\n");
  return { headline: row.title, paragraphs, cta, html, text };
}

async function copyText(value: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(value); return true; } catch { return false; }
}

/**
 * Share one activation two ways: message other staff on the channels they use,
 * or take a ready-made post to the school website. Nothing is sent from BLTZ;
 * each destination opens with the text filled in, or the text is copied.
 */
export function ShareActivation({ row, schoolName, onClose }: { row: PilotActivation; schoolName: string; onClose: () => void }) {
  const fanLink = new URL(row.trackedHref, window.location.origin).toString();
  const workspaceLink = window.location.href.split("#")[0];
  const [tab, setTab] = useState<"staff" | "site">("staff");
  const [message, setMessage] = useState(() => staffMessage(row, fanLink, workspaceLink));
  const [copied, setCopied] = useState<string | null>(null);
  const post = sitePost(row, fanLink, schoolName);
  const subject = `${KIND_LABEL[row.kind]}: ${row.title}`;

  async function copy(key: string, value: string) {
    if (await copyText(value)) { setCopied(key); window.setTimeout(() => setCopied((current) => current === key ? null : current), 1800); }
  }
  const hint = (key: string, idle: string, done: string) => copied === key ? done : idle;
  // Rendered at the workspace root: the activation card animates with transforms, which would trap a fixed dialog.
  const host = document.querySelector<HTMLElement>('[data-product="enterprise-crm"]') ?? document.body;

  return createPortal(
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-labelledby="pilot-share-title" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <div className="pilot-modal__scrim" onClick={onClose} />
      <div className="pilot-modal__panel pilot-share">
        <div className="pilot-card-head">
          <div><h2 id="pilot-share-title">Share</h2><p>{row.title}</p></div>
          <button type="button" className="pilot-icon-pill" aria-label="Close" onClick={onClose}><IconX stroke={1.5} aria-hidden /></button>
        </div>
        <div className="pilot-share__tabs" role="tablist" aria-label="Share with">
          <button type="button" role="tab" aria-selected={tab === "staff"} className={cn("pilot-chip", tab === "staff" && "pilot-chip--on")} onClick={() => setTab("staff")}><IconMessage stroke={1.5} aria-hidden />Message staff</button>
          <button type="button" role="tab" aria-selected={tab === "site"} className={cn("pilot-chip", tab === "site" && "pilot-chip--on")} onClick={() => setTab("site")}><IconWorld stroke={1.5} aria-hidden />Publish on your site</button>
        </div>

        {tab === "staff" ? (
          <div role="tabpanel" className="pilot-share__panel">
            <label className="pilot-field">Message<textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
            <div className="pilot-share__grid">
              <a className="pilot-share__dest" href={`mailto:?${new URLSearchParams({ subject, body: message }).toString().replace(/\+/g, "%20")}`}>
                <IconMail stroke={1.5} aria-hidden /><span><strong>Email</strong><small>Opens your mail app with the note filled in</small></span>
              </a>
              <a className="pilot-share__dest" href={`https://teams.microsoft.com/share?${new URLSearchParams({ href: workspaceLink, msgText: message.split("\n")[0], preview: "true" })}`} target="_blank" rel="noopener noreferrer">
                <IconBrandTeams stroke={1.5} aria-hidden /><span><strong>Microsoft Teams</strong><small>Pick a chat or channel</small></span>
              </a>
              <button type="button" className="pilot-share__dest" onClick={() => void copy("slack", message)}>
                <IconBrandSlack stroke={1.5} aria-hidden /><span><strong>Slack</strong><small>{hint("slack", "Copy the note for a channel", "Copied. Paste into Slack.")}</small></span>
              </button>
              <button type="button" className="pilot-share__dest" onClick={() => void copy("chat", message)}>
                <IconBrandGoogle stroke={1.5} aria-hidden /><span><strong>Google Chat</strong><small>{hint("chat", "Copy the note for a space", "Copied. Paste into Chat.")}</small></span>
              </button>
              <a className="pilot-share__dest" href={`sms:?&body=${encodeURIComponent(message)}`}>
                <IconMessage stroke={1.5} aria-hidden /><span><strong>Text message</strong><small>Opens Messages on your phone</small></span>
              </a>
              <button type="button" className="pilot-share__dest" onClick={() => void copy("message", message)}>
                <IconCopy stroke={1.5} aria-hidden /><span><strong>Copy</strong><small>{hint("message", "Paste it anywhere", "Copied")}</small></span>
              </button>
            </div>
          </div>
        ) : (
          <div role="tabpanel" className="pilot-share__panel">
            <article className="pilot-share__post" aria-label="Website post preview">
              <h3>{post.headline}</h3>
              {post.paragraphs.map((line) => <p key={line}>{line}</p>)}
              <a href={fanLink} target="_blank" rel="noopener noreferrer">{post.cta}</a>
            </article>
            <div className="pilot-share__row">
              <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" onClick={() => void copy("html", post.html)}>{copied === "html" ? <IconCheck stroke={1.5} aria-hidden /> : null}{copied === "html" ? "HTML copied" : "Copy HTML"}</button>
              <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => void copy("text", post.text)}>{copied === "text" ? "Text copied" : "Copy as text"}</button>
            </div>
            <p className="pilot-quiet">Paste into your website editor. The fan Locker link is tracked, so visits from the post count toward this activation. Once it is live, use Mark posted and choose Website.</p>
          </div>
        )}
        <p className="pilot-share__note">Nothing is sent from BLTZ. Each option opens with the text filled in, or copies it.</p>
      </div>
    </div>,
    host,
  );
}
