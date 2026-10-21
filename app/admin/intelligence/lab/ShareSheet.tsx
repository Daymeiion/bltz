"use client";

import { useEffect, useRef, useState } from "react";
import { IconBrandGoogle, IconBrandSlack, IconBrandTeams, IconBrandWhatsapp, IconCheck, IconCopy, IconExternalLink, IconLink, IconMail, IconSend, IconX } from "@tabler/icons-react";
import { momentDate } from "../CareerWorkspace";
import { dayLabel, type Model } from "./model";
import type { Activation } from "./StoryParts";
import styles from "./lab.module.css";

const KIND_LABEL: Record<Activation["kind"], string> = { article: "Article", video: "Video", interview: "Interview request", social: "Social post", gallery: "Photo gallery" };

/** Links into the approved Lab, which already opens a Moment from these query parameters. */
function labLink(item: Activation, m: Model): string {
  const params = new URLSearchParams({ athlete: m.athlete?.id ?? "", asOf: m.asOf });
  if (item.momentId) { params.set("view", "moment"); params.set("moment", item.momentId); }
  return `${window.location.origin}/admin/intelligence?${params}`;
}
function message(item: Activation, m: Model, link: string, style: "slack" | "plain"): string {
  const bold = (value: string) => style === "slack" ? `*${value}*` : value;
  const moment = m.moments.find(row => row.id === item.momentId);
  const media = item.mediaIds.map(id => m.media.find(row => row.id === id)?.title).filter(Boolean);
  return [
    `${bold(`Activation draft: ${item.title}`)}`,
    `${KIND_LABEL[item.kind]} for ${m.athlete?.name ?? "athlete"}${item.due ? `, due ${dayLabel(item.due)}` : ""}`,
    moment ? `Moment: ${moment.title} (${momentDate(moment)})` : null,
    item.brief ? `Brief: ${item.brief}` : null,
    item.mediaIds.length ? `Media: ${media.length ? media.join(", ") : `${item.mediaIds.length} linked`}` : null,
    `Open in BLTZ: ${link}`,
  ].filter(Boolean).join("\n");
}

async function copy(text: string): Promise<boolean> { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

function CopyIcon({ text, label, icon }: { text: () => string; label: string; icon: React.ReactNode }) {
  const [done, setDone] = useState(false);
  return <button type="button" className={styles.shareIcon} aria-label={label} title={label} onClick={async () => { if (await copy(text())) { setDone(true); window.setTimeout(() => setDone(false), 1600); } }}>{done ? <IconCheck size={17} stroke={1.8} aria-hidden="true" /> : icon}</button>;
}

/** One compact row per draft: Slack, Teams, email, copy link. Nothing leaves BLTZ until the person confirms in the destination. */
export function ShareRow({ item, m }: { item: Activation; m: Model }) {
  const [sheet, setSheet] = useState(false);
  const plain = () => message(item, m, labLink(item, m), "plain");
  const teams = () => `https://teams.microsoft.com/share?${new URLSearchParams({ href: labLink(item, m), msgText: `Activation draft: ${item.title}`, preview: "true" })}`;
  const mail = () => `mailto:?${new URLSearchParams({ subject: `Activation draft: ${item.title}`, body: plain() }).toString().replace(/\+/g, "%20")}`;
  return <>
    <div className={styles.shareRow} role="group" aria-label={`Share ${item.title}`}>
      <button type="button" className={styles.shareIcon} data-brand="slack" aria-label="Send to Slack" title="Send to Slack" onClick={() => setSheet(true)}><IconBrandSlack size={17} stroke={1.8} aria-hidden="true" /></button>
      <a className={styles.shareIcon} data-brand="teams" href="#" aria-label="Share to Microsoft Teams" title="Share to Microsoft Teams" onClick={event => { event.preventDefault(); window.open(teams(), "_blank", "noopener,noreferrer,width=700,height=640"); }}><IconBrandTeams size={17} stroke={1.8} aria-hidden="true" /></a>
      <a className={styles.shareIcon} href="#" aria-label="Email this draft" title="Email" onClick={event => { event.preventDefault(); window.location.href = mail(); }}><IconMail size={17} stroke={1.8} aria-hidden="true" /></a>
      <CopyIcon text={() => labLink(item, m)} label="Copy link" icon={<IconLink size={17} stroke={1.8} aria-hidden="true" />} />
      <button type="button" className={styles.shareMore} onClick={() => setSheet(true)}>More</button>
    </div>
    {sheet && <ShareSheet item={item} m={m} onClose={() => setSheet(false)} />}
  </>;
}

function ShareSheet({ item, m, onClose }: { item: Activation; m: Model; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const link = labLink(item, m);
  const [text, setText] = useState(() => message(item, m, link, "slack"));
  const [slack, setSlack] = useState<"checking" | "ready" | "not_configured" | "sending" | "sent" | "failed">("checking");
  const [copied, setCopied] = useState<string | null>(null);
  // No close() in cleanup: React's dev double-run would fire "close" and dismiss the sheet.
  useEffect(() => { const node = ref.current; if (node && !node.open) node.showModal(); }, []);
  useEffect(() => {
    let live = true;
    fetch("/api/admin/intelligence/share/slack", { credentials: "same-origin", cache: "no-store" }).then(response => response.json()).then((body: { state?: string }) => { if (live) setSlack(body.state === "ready" ? "ready" : "not_configured"); }).catch(() => { if (live) setSlack("not_configured"); });
    return () => { live = false; };
  }, []);
  async function send() {
    setSlack("sending");
    try {
      const response = await fetch("/api/admin/intelligence/share/slack", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const body = await response.json() as { state?: string };
      setSlack(body.state === "sent" ? "sent" : body.state === "not_configured" ? "not_configured" : "failed");
    } catch { setSlack("failed"); }
  }
  async function copyAs(label: string, value: string) { if (await copy(value)) { setCopied(label); window.setTimeout(() => setCopied(null), 1800); } }
  const plainText = text.replace(/\*(.+?)\*/g, "$1");
  return <dialog ref={ref} className={`${styles.dialog} ${styles.shareDialog}`} onClose={onClose} onClick={event => { if (event.target === ref.current) onClose(); }} aria-labelledby="share-title">
    <div className={styles.picker}>
      <header className={styles.pickerHead}><h3 id="share-title">Share draft</h3><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close"><IconX size={16} aria-hidden="true" /></button></header>
      <label className={styles.field}><span>Message</span><textarea rows={7} value={text} onChange={event => setText(event.target.value)} /></label>
      <div className={styles.destinations}>
        <div className={styles.destination} data-brand="slack">
          <IconBrandSlack size={22} stroke={1.6} aria-hidden="true" />
          <div><strong>Slack</strong><small>{slack === "ready" ? "Posts to the activations channel" : slack === "sent" ? "Posted to Slack" : slack === "failed" ? "Slack did not accept the message. Try again or copy it." : slack === "checking" ? "Checking connection…" : slack === "sending" ? "Sending…" : "Not connected yet. Copy and paste into any channel."}</small></div>
          {slack === "ready" || slack === "failed" ? <button type="button" className={styles.primaryButton} onClick={send}><IconSend size={15} aria-hidden="true" />Send</button>
            : slack === "sent" ? <span className={styles.sentTag}><IconCheck size={15} aria-hidden="true" />Sent</span>
            : <button type="button" className={styles.ghostButton} disabled={slack === "checking" || slack === "sending"} onClick={() => copyAs("slack", text)}>{copied === "slack" ? "Copied" : "Copy for Slack"}</button>}
        </div>
        <a className={styles.destination} data-brand="teams" href={`https://teams.microsoft.com/share?${new URLSearchParams({ href: link, msgText: plainText.split("\n")[0], preview: "true" })}`} target="_blank" rel="noopener noreferrer"><IconBrandTeams size={22} stroke={1.6} aria-hidden="true" /><div><strong>Microsoft Teams</strong><small>Pick a chat or channel in Teams</small></div><IconExternalLink size={16} aria-hidden="true" /></a>
        <a className={styles.destination} href={`mailto:?${new URLSearchParams({ subject: `Activation draft: ${item.title}`, body: plainText }).toString().replace(/\+/g, "%20")}`}><IconMail size={22} stroke={1.6} aria-hidden="true" /><div><strong>Email</strong><small>Opens your mail app with the draft filled in</small></div><IconExternalLink size={16} aria-hidden="true" /></a>
        <button type="button" className={styles.destination} onClick={() => copyAs("chat", plainText)}><IconBrandGoogle size={22} stroke={1.6} aria-hidden="true" /><div><strong>Google Chat</strong><small>{copied === "chat" ? "Copied. Paste into a space." : "Copy the message for a Chat space"}</small></div><IconCopy size={16} aria-hidden="true" /></button>
        <a className={styles.destination} data-brand="whatsapp" href={`https://wa.me/?${new URLSearchParams({ text: plainText })}`} target="_blank" rel="noopener noreferrer"><IconBrandWhatsapp size={22} stroke={1.6} aria-hidden="true" /><div><strong>WhatsApp</strong><small>Choose a contact or group</small></div><IconExternalLink size={16} aria-hidden="true" /></a>
        <button type="button" className={styles.destination} onClick={() => copyAs("link", link)}><IconLink size={22} stroke={1.6} aria-hidden="true" /><div><strong>Copy link</strong><small>{copied === "link" ? "Link copied" : "Opens this Moment in the Lab for anyone signed in as staff"}</small></div><IconCopy size={16} aria-hidden="true" /></button>
      </div>
      <footer className={styles.pickerFoot}><span className={styles.draftNote}>Nothing is sent until you confirm in the destination.</span><button type="button" className={styles.ghostButton} onClick={onClose}>Done</button></footer>
    </div>
  </dialog>;
}
