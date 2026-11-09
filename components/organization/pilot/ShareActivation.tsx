"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { IconBrandGoogle, IconBrandSlack, IconBrandTeams, IconBrandWordpress, IconCheck, IconCopy, IconMail, IconMessage, IconSend, IconWorld, IconX } from "@tabler/icons-react";
import type { ActivationKind, PilotActivation } from "@/lib/enterprise-crm/pilot/types";
import type { IntegrationKind, IntegrationStatus } from "@/lib/enterprise-crm/pilot/integrations-shared";
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
 * or take a ready-made post to the school website. Tools the school connected in
 * Settings send directly; everything else opens prefilled or copies the text.
 */
export function ShareActivation({ row, schoolName, organizationId, connections = [], settingsHref, preview = false, onClose }: {
  row: PilotActivation;
  schoolName: string;
  organizationId: string;
  connections?: IntegrationStatus[];
  settingsHref: string;
  preview?: boolean;
  onClose: () => void;
}) {
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
  const [sending, setSending] = useState<Partial<Record<IntegrationKind, "sending" | "sent" | "failed">>>({});
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const connected = (kind: IntegrationKind) => connections.find((row) => row.kind === kind) ?? null;

  async function deliver(kind: IntegrationKind) {
    setSending((current) => ({ ...current, [kind]: "sending" }));
    if (preview) { await new Promise((resolve) => window.setTimeout(resolve, 400)); setSending((current) => ({ ...current, [kind]: "sent" })); return; }
    const body = kind === "slack" ? { destination: kind, activationId: row.id, message }
      : kind === "teams" ? { destination: kind, activationId: row.id, message, workspaceLink }
      : { destination: kind, activationId: row.id, post: { headline: post.headline, paragraphs: post.paragraphs, cta: post.cta, link: fanLink } };
    try {
      const response = await fetch(`/api/organization/${organizationId}/share`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { state?: string; url?: string };
      if (result.url) setDraftUrl(result.url);
      setSending((current) => ({ ...current, [kind]: response.ok && result.state === "sent" ? "sent" : "failed" }));
    } catch {
      setSending((current) => ({ ...current, [kind]: "failed" }));
    }
  }
  const sendLabel = (kind: IntegrationKind, idle: string) => sending[kind] === "sending" ? "Sending" : sending[kind] === "sent" ? "Sent" : sending[kind] === "failed" ? "Failed, try again" : idle;
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
            <div className="pilot-share__send">
              <h3>Send to your channels</h3>
              {connected("slack") || connected("teams") ? (
                <div className="pilot-share__send-row">
                  {(["slack", "teams"] as const).map((kind) => {
                    const connection = connected(kind);
                    if (!connection) return null;
                    const Icon = kind === "slack" ? IconBrandSlack : IconBrandTeams;
                    return <button key={kind} type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={sending[kind] === "sending" || sending[kind] === "sent"} onClick={() => void deliver(kind)}>{sending[kind] === "sent" ? <IconCheck stroke={1.5} aria-hidden /> : <Icon stroke={1.5} aria-hidden />}{sendLabel(kind, `Send to ${connection.label ?? (kind === "slack" ? "Slack" : "Teams")}`)}</button>;
                  })}
                </div>
              ) : null}
              {!connected("slack") || !connected("teams") ? <p>{connected("slack") || connected("teams") ? "Connect the other tool" : "Connect Slack or Microsoft Teams"} in <a href={settingsHref}>Settings</a> to send with one click.</p> : null}
            </div>
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
            <div className="pilot-share__send">
              <h3>Your website</h3>
              {connected("wordpress") ? (
                <div className="pilot-share__send-row">
                  <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={sending.wordpress === "sending" || sending.wordpress === "sent"} onClick={() => void deliver("wordpress")}>{sending.wordpress === "sent" ? <IconCheck stroke={1.5} aria-hidden /> : <IconBrandWordpress stroke={1.5} aria-hidden />}{sendLabel("wordpress", `Create a draft on ${connected("wordpress")!.label ?? "your site"}`)}</button>
                  {draftUrl ? <a className="pilot-pill pilot-pill--quiet" href={draftUrl} target="_blank" rel="noopener noreferrer"><IconSend stroke={1.5} aria-hidden />Open the draft</a> : null}
                </div>
              ) : <p>Connect your WordPress site in <a href={settingsHref}>Settings</a> to create the draft with one click, or copy the post below.</p>}
              {sending.wordpress === "sent" ? <p>Saved as a draft. Your web team reviews and publishes it in WordPress.</p> : null}
            </div>
            <div className="pilot-share__row">
              <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" onClick={() => void copy("html", post.html)}>{copied === "html" ? <IconCheck stroke={1.5} aria-hidden /> : null}{copied === "html" ? "HTML copied" : "Copy HTML"}</button>
              <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => void copy("text", post.text)}>{copied === "text" ? "Text copied" : "Copy as text"}</button>
            </div>
            <p className="pilot-quiet">Paste into your website editor. The fan Locker link is tracked, so visits from the post count toward this activation. Once it is live, use Mark posted and choose Website.</p>
          </div>
        )}
        <p className="pilot-share__note">Only the Send and Create draft buttons post from BLTZ. The other options open with the text filled in, or copy it.</p>
      </div>
    </div>,
    host,
  );
}
