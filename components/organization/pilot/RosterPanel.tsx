"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { IconCheck, IconCopy, IconMail, IconPlus, IconSearch, IconSend, IconX } from "@tabler/icons-react";
import { LOCKER_STATE_LABEL, type LockerState, type RosterAthlete, type RosterInvite } from "@/lib/enterprise-crm/pilot/roster-shared";
import { cn } from "@/lib/utils";
import { Bezel } from "./PilotPrimitives";

const PAGE = 40;
const FILTERS: Array<{ id: "all" | LockerState; label: string }> = [
  { id: "all", label: "All" }, { id: "none", label: "No Locker yet" }, { id: "ready", label: "Ready, not claimed" }, { id: "claimed", label: "Claimed" },
];
const INVITE_LABEL: Record<RosterInvite["status"], string> = { created: "Link created", sent: "Invite sent", send_failed: "Email failed", opened: "Invite opened", signed_up: "Signed up", revoked: "Invite off" };

/**
 * Every former player BLTZ knows for this school, with or without a Locker. Staff invite
 * players to claim their Locker (BLTZ email or a link they send) and add players BLTZ
 * does not have yet.
 */
export function RosterPanel({ organizationId, initial, unavailable = false, intelligenceHref, preview = false }: {
  organizationId: string;
  initial: RosterAthlete[];
  unavailable?: boolean;
  intelligenceHref: string;
  preview?: boolean;
}) {
  const [athletes, setAthletes] = useState(initial);
  const [filter, setFilter] = useState<"all" | LockerState>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [inviting, setInviting] = useState<RosterAthlete | null>(null);
  const [adding, setAdding] = useState(false);
  const counts = useMemo(() => ({ all: athletes.length, none: athletes.filter((row) => row.lockerState === "none").length, ready: athletes.filter((row) => row.lockerState === "ready").length, claimed: athletes.filter((row) => row.lockerState === "claimed").length }), [athletes]);
  const needle = query.trim().toLowerCase();
  const visible = athletes.filter((row) => (filter === "all" || row.lockerState === filter) && (!needle || row.name.toLowerCase().includes(needle)));
  const update = (id: string, patch: Partial<RosterAthlete>) => setAthletes((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));

  return (
    <Bezel label="Your players" coreClassName="pilot-roster">
      <div className="pilot-card-head">
        <div><h2>Your players</h2><p>Everyone BLTZ has on record for your school. Invite a player to claim their Locker, or add someone who is missing.</p></div>
        <button type="button" className="pilot-pill pilot-pill--ghost" onClick={() => setAdding(true)}><span>Add a player</span><span className="pilot-pill__icon" aria-hidden><IconPlus stroke={1.5} /></span></button>
      </div>
      {unavailable ? <p role="alert" className="pilot-tool__error">Your player list could not be loaded. Try again in a few minutes.</p> : null}

      <div className="pilot-roster__tools">
        <label className="pilot-search pilot-search--block"><IconSearch stroke={1.5} aria-hidden /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setShown(PAGE); }} placeholder="Find a player" aria-label="Find a player on your roster" /></label>
        <div className="pilot-roster__filters" role="radiogroup" aria-label="Locker status">
          {FILTERS.map((item) => <button key={item.id} type="button" role="radio" aria-checked={filter === item.id} className={cn("pilot-chip", filter === item.id && "pilot-chip--on")} onClick={() => { setFilter(item.id); setShown(PAGE); }}>{item.label}<b>{counts[item.id]}</b></button>)}
        </div>
      </div>

      {visible.length ? (
        <ul className="pilot-roster__list">
          {visible.slice(0, shown).map((row) => (
            <li key={row.id} className="pilot-roster__row">
              <span className="pilot-roster__who"><strong>{row.name}</strong><small>{[row.position, row.sport && row.sport !== "Football" ? row.sport : null, row.years].filter(Boolean).join(" · ") || (row.source === "staff_added" ? "Added by your staff" : "Former player")}</small></span>
              <span className={cn("pilot-roster__state", `pilot-roster__state--${row.lockerState}`)}>{LOCKER_STATE_LABEL[row.lockerState]}</span>
              <span className="pilot-roster__invite">{row.invite ? INVITE_LABEL[row.invite.status] : ""}</span>
              <span className="pilot-roster__actions">
                {row.playerId ? <Link className="pilot-pill pilot-pill--quiet" href={`${intelligenceHref}/${row.playerId}`}>Intelligence</Link> : null}
                {row.lockerState !== "claimed" ? <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" onClick={() => setInviting(row)}><IconSend stroke={1.5} aria-hidden />{row.invite ? "Invite again" : "Invite"}</button> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="pilot-quiet">{athletes.length ? "No player matches." : "No players listed yet. BLTZ adds your former players when your workspace is approved; you can also add players yourself."}</p>}
      {visible.length > shown ? <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, visible.length - shown)} more of {visible.length}</button> : null}

      {inviting ? <InviteDialog organizationId={organizationId} athlete={inviting} preview={preview} onClose={() => setInviting(null)} onInvited={(invite, hasEmail) => update(inviting.id, { invite, hasEmail: inviting.hasEmail || hasEmail })} /> : null}
      {adding ? <AddDialog organizationId={organizationId} preview={preview} onClose={() => setAdding(false)} onAdded={(athlete) => { setAthletes((current) => [athlete, ...current]); setAdding(false); }} /> : null}
    </Bezel>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  const host = document.querySelector<HTMLElement>('[data-product="enterprise-crm"]') ?? document.body;
  return createPortal(
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <div className="pilot-modal__scrim" onClick={onClose} />
      <div className="pilot-modal__panel pilot-roster-dialog">
        <div className="pilot-card-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button type="button" className="pilot-icon-pill" aria-label="Close" onClick={onClose}><IconX stroke={1.5} aria-hidden /></button></div>
        {children}
      </div>
    </div>,
    host,
  );
}

const INVITE_ERROR: Record<string, string> = {
  already_claimed: "This player has already claimed their Locker.",
  email_required: "Add the player's email to send it from BLTZ, or copy the link instead.",
  daily_limit: "You have reached today's limit for emailed invites. Copy links instead, or continue tomorrow.",
};

function InviteDialog({ organizationId, athlete, preview, onClose, onInvited }: { organizationId: string; athlete: RosterAthlete; preview: boolean; onClose: () => void; onInvited: (invite: RosterInvite, hasEmail: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"email" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; emailed: boolean; emailState: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function invite(channel: "email" | "link") {
    setBusy(channel); setError(null);
    if (preview) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      const now = new Date();
      setResult({ url: `${window.location.origin}/join/template-preview`, emailed: channel === "email", emailState: channel === "email" ? "sent" : null });
      onInvited({ id: crypto.randomUUID(), status: channel === "email" ? "sent" : "created", channel, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 30 * 86_400_000).toISOString() }, Boolean(email));
      setBusy(null);
      return;
    }
    const response = await fetch(`/api/organization/${organizationId}/invites`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId: athlete.id, channel, email: email || null }) }).catch(() => null);
    const body = await response?.json().catch(() => ({})) as { state?: string; url?: string; emailed?: boolean; emailState?: string | null; invite?: RosterInvite };
    setBusy(null);
    if (!response?.ok || !body.url || !body.invite) { setError(INVITE_ERROR[body?.state ?? ""] ?? "The invite could not be created. Try again."); return; }
    setResult({ url: body.url, emailed: Boolean(body.emailed), emailState: body.emailState ?? null });
    onInvited(body.invite, Boolean(email));
  }

  return (
    <Modal title={`Invite ${athlete.name}`} subtitle="A personal link for them to claim their Locker. It works for 30 days." onClose={onClose}>
      {result ? (
        <div className="pilot-roster-dialog__body">
          <p className="pilot-signal-add__badge"><IconCheck stroke={2} aria-hidden />{result.emailed ? "Invite emailed from BLTZ on your behalf." : result.emailState === "not_configured" ? "BLTZ email is not switched on yet, so send this link yourself." : result.emailState === "failed" ? "The email did not go out. Send this link yourself." : "Link ready. Send it by text, DM or email."}{preview ? " (Template: nothing is sent.)" : ""}</p>
          <div className="pilot-brief-builder__link"><code>{result.url}</code></div>
          <div className="pilot-share__send-row">
            <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" onClick={async () => { try { await navigator.clipboard.writeText(result.url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } }}>{copied ? <IconCheck stroke={1.5} aria-hidden /> : <IconCopy stroke={1.5} aria-hidden />}{copied ? "Copied" : "Copy link"}</button>
            <button type="button" className="pilot-pill pilot-pill--quiet" onClick={onClose}>Done</button>
          </div>
          <p className="pilot-share__note">You will see here when {athlete.name.split(/\s+/)[0]} opens it and signs up.</p>
        </div>
      ) : (
        <div className="pilot-roster-dialog__body">
          <label className="pilot-field">{athlete.hasEmail ? "Email (leave empty to use the one on file)" : "Player's email (for a BLTZ email)"}<input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="off" /></label>
          {error ? <p role="alert" className="pilot-tool__error">{error}</p> : null}
          <div className="pilot-share__send-row">
            <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={busy !== null || (!email && !athlete.hasEmail)} onClick={() => void invite("email")}><IconMail stroke={1.5} aria-hidden />{busy === "email" ? "Sending" : "Send from BLTZ"}</button>
            <button type="button" className="pilot-pill pilot-pill--quiet" disabled={busy !== null} onClick={() => void invite("link")}><IconCopy stroke={1.5} aria-hidden />{busy === "link" ? "Creating" : "Get a link to send myself"}</button>
          </div>
          <p className="pilot-share__note">The email comes from BLTZ and names your school. The player&apos;s email stays private to your workspace.</p>
        </div>
      )}
    </Modal>
  );
}

function AddDialog({ organizationId, preview, onClose, onAdded }: { organizationId: string; preview: boolean; onClose: () => void; onAdded: (athlete: RosterAthlete) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const payload = { name: value("name"), sport: value("sport") || null, position: value("position") || null, years: value("years") || null, email: value("email") || null };
    setBusy(true); setError(null);
    if (preview) {
      onAdded({ id: crypto.randomUUID(), name: payload.name, position: payload.position, years: payload.years, sport: payload.sport, source: "staff_added", lockerState: "none", playerId: null, lockerHref: null, hasEmail: Boolean(payload.email), invite: null });
      return;
    }
    const response = await fetch(`/api/organization/${organizationId}/roster`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const body = await response?.json().catch(() => ({})) as { athlete?: RosterAthlete };
    setBusy(false);
    if (!response?.ok || !body.athlete) { setError("That player could not be added. Check the name and email."); return; }
    onAdded(body.athlete);
  }

  return (
    <Modal title="Add a player" subtitle="For former players BLTZ does not list yet, in any sport." onClose={onClose}>
      <form className="pilot-roster-dialog__body" onSubmit={(event) => void add(event)}>
        <label className="pilot-field">Name<input name="name" required minLength={2} maxLength={120} autoComplete="off" /></label>
        <div className="pilot-signal-add__row">
          <label className="pilot-field">Sport<input name="sport" maxLength={60} placeholder="e.g. Women's basketball" /></label>
          <label className="pilot-field">Position<input name="position" maxLength={40} /></label>
        </div>
        <div className="pilot-signal-add__row">
          <label className="pilot-field">Years at your school<input name="years" maxLength={40} placeholder="e.g. 2008–11" /></label>
          <label className="pilot-field">Email (optional)<input name="email" type="email" maxLength={254} autoComplete="off" /></label>
        </div>
        {error ? <p role="alert" className="pilot-tool__error">{error}</p> : null}
        <div className="pilot-modal__actions">
          <button type="button" className="pilot-pill pilot-pill--quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={busy}>{busy ? "Adding" : "Add player"}</button>
        </div>
      </form>
    </Modal>
  );
}
