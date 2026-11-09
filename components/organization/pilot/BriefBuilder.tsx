"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconCopy, IconExternalLink, IconEye, IconFileText, IconMail, IconPlus, IconSparkles, IconTrash, IconX } from "@tabler/icons-react";
import { buildBriefFacts, plainNarrative, type BriefSources } from "@/lib/enterprise-crm/pilot/brief-facts";
import type { BriefFacts, BriefIdea, BriefNarrative, BriefRecipient, BriefSummary } from "@/lib/enterprise-crm/pilot/briefs-shared";
import { cn } from "@/lib/utils";
import { BriefDocument } from "./BriefDocument";

type Stage = "recipient" | "drafting" | "edit" | "sharing" | "shared";
const EMPTY_RECIPIENT: BriefRecipient = { brandName: "", contactName: null, contactEmail: null, goal: null, budget: null };

/** Template only: a written-out narrative from the facts, standing in for the AI. */
function templateNarrative(facts: BriefFacts, recipient: BriefRecipient): BriefNarrative {
  const base = plainNarrative(facts, recipient.brandName, recipient.goal);
  const first = facts.athlete.name.split(/\s+/)[0];
  const next = facts.channels.upcoming[0];
  return {
    ...base,
    fit: `${base.fit} ${first}'s fan Locker gives ${recipient.brandName} a place fans already visit, and ${facts.school.name} can amplify it through its own channels.`,
    ideas: [
      ...base.ideas,
      { title: "Presenting partner on the fan Locker", channel: "Locker hero video", timing: "Any time", description: `${recipient.brandName} presents ${first}'s Locker highlight reel.` },
      { title: "Branded throwback gallery", channel: "Photo Room", timing: next ? next.targetDate : "Any time", description: "A sponsored gallery of career photos, shared by the school and the athlete." },
    ].slice(0, 3),
  };
}

/**
 * Create a partnership brief for an outside brand: who it is for, an AI draft of the
 * pitch over facts BLTZ assembles, edits and a preview, the athlete's approval, then a
 * private link (with PDF) the school sends.
 */
export function BriefBuilder({ organizationId, sources, playerName, preview, onShared, onClose }: {
  organizationId: string;
  sources: BriefSources;
  playerName: string;
  preview: boolean;
  onShared: (brief: BriefSummary) => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("recipient");
  const [recipient, setRecipient] = useState<BriefRecipient>(EMPTY_RECIPIENT);
  const [facts, setFacts] = useState<BriefFacts | null>(null);
  const [narrative, setNarrative] = useState<BriefNarrative | null>(null);
  const [aiDrafted, setAiDrafted] = useState(false);
  const [partners, setPartners] = useState<Array<{ name: string; note: string | null }>>([]);
  const [partnerName, setPartnerName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<7 | 30 | 90>(30);
  const [consent, setConsent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const api = `/api/organization/${organizationId}`;
  const host = document.querySelector<HTMLElement>('[data-product="enterprise-crm"]') ?? document.body;
  const shownFacts = facts ? { ...facts, brands: [...facts.brands, ...partners.filter((partner) => !facts.brands.some((brand) => brand.name.toLowerCase() === partner.name.toLowerCase()))] } : null;

  async function draft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipient.brandName.trim()) return;
    setStage("drafting"); setError(null); setNotice(null);
    if (preview) {
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      const local = buildBriefFacts({ ...sources, origin: window.location.origin });
      setFacts(local); setNarrative(templateNarrative(local, recipient)); setAiDrafted(true);
      setNotice("Template: the live workspace writes these sections with AI.");
      setStage("edit");
      return;
    }
    const response = await fetch(`${api}/briefs/draft`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerId: sources.file.player.id, recipient }) }).catch(() => null);
    const body = await response?.json().catch(() => ({})) as { facts?: BriefFacts; narrative?: BriefNarrative | null; ai?: string };
    if (!response?.ok || !body.facts) { setError("The brief could not be started. Try again."); setStage("recipient"); return; }
    setFacts(body.facts);
    setNarrative(body.narrative ?? plainNarrative(body.facts, recipient.brandName, recipient.goal));
    setAiDrafted(Boolean(body.narrative));
    if (!body.narrative) setNotice(body.ai === "not_configured" ? "AI writing is not set up yet, so these sections are a starting point to edit." : "AI did not answer, so these sections are a starting point to edit.");
    setStage("edit");
  }

  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!narrative || !consent) return;
    setStage("sharing"); setError(null);
    if (preview) {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
      setLink({ url: `${window.location.origin}/brief/template-preview`, expiresAt });
      onShared({ id: crypto.randomUUID(), playerId: sources.file.player.id, brandName: recipient.brandName, contactName: recipient.contactName, status: "shared", expiresAt, createdAt: new Date().toISOString(), viewCount: 0, lastViewedAt: null });
      setStage("shared");
      return;
    }
    const response = await fetch(`${api}/briefs`, {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: sources.file.player.id, recipient, narrative, partners, origin: aiDrafted ? "ai" : "manual", expiresInDays, athleteConsent: true }),
    }).catch(() => null);
    const body = await response?.json().catch(() => ({})) as { id?: string; url?: string; expiresAt?: string };
    if (!response?.ok || !body.url || !body.id || !body.expiresAt) { setError("The link could not be created. Check that every section has text."); setStage("edit"); return; }
    setLink({ url: body.url, expiresAt: body.expiresAt });
    onShared({ id: body.id, playerId: sources.file.player.id, brandName: recipient.brandName, contactName: recipient.contactName, status: "shared", expiresAt: body.expiresAt, createdAt: new Date().toISOString(), viewCount: 0, lastViewedAt: null });
    setStage("shared");
  }

  const setIdea = (index: number, patch: Partial<BriefIdea>) => narrative && setNarrative({ ...narrative, ideas: narrative.ideas.map((idea, at) => at === index ? { ...idea, ...patch } : idea) });
  const mail = link ? `mailto:${encodeURIComponent(recipient.contactEmail ?? "")}?${new URLSearchParams({
    subject: `${playerName} × ${recipient.brandName}: partnership brief`,
    body: `Hi${recipient.contactName ? ` ${recipient.contactName.split(" ")[0]}` : ""},\n\nHere is a partnership brief for ${playerName}, from ${sources.schoolName}:\n${link.url}\n\nThe link works until ${new Date(link.expiresAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}, and you can save it as a PDF from the page.\n\nThanks,`,
  }).toString().replace(/\+/g, "%20")}` : "";

  return createPortal(
    <div className="pilot-modal pilot-modal--wide" role="dialog" aria-modal="true" aria-labelledby="pilot-brief-title" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <div className="pilot-modal__scrim" onClick={onClose} />
      <div className="pilot-modal__panel pilot-brief-builder">
        <div className="pilot-card-head">
          <div><h2 id="pilot-brief-title">Partnership brief</h2><p>{playerName} · for an outside brand</p></div>
          <button type="button" className="pilot-icon-pill" aria-label="Close" onClick={onClose}><IconX stroke={1.5} aria-hidden /></button>
        </div>

        {stage === "recipient" || stage === "drafting" ? (
          <form className="pilot-brief-builder__form" onSubmit={(event) => void draft(event)}>
            <div className="pilot-signal-add__row">
              <label className="pilot-field">Brand<input required maxLength={120} value={recipient.brandName} onChange={(event) => setRecipient({ ...recipient, brandName: event.target.value })} placeholder="Company or brand name" /></label>
              <label className="pilot-field">Budget (optional)<input maxLength={120} value={recipient.budget ?? ""} onChange={(event) => setRecipient({ ...recipient, budget: event.target.value || null })} placeholder="e.g. $5K–$10K" /></label>
            </div>
            <div className="pilot-signal-add__row">
              <label className="pilot-field">Contact name (optional)<input maxLength={120} value={recipient.contactName ?? ""} onChange={(event) => setRecipient({ ...recipient, contactName: event.target.value || null })} /></label>
              <label className="pilot-field">Contact email (optional)<input type="email" maxLength={254} value={recipient.contactEmail ?? ""} onChange={(event) => setRecipient({ ...recipient, contactEmail: event.target.value || null })} /></label>
            </div>
            <label className="pilot-field">What they are looking for<textarea rows={3} maxLength={1000} value={recipient.goal ?? ""} onChange={(event) => setRecipient({ ...recipient, goal: event.target.value || null })} placeholder="e.g. A Bay Area former player for a fall campaign around community fitness." /></label>
            {error ? <p role="alert" className="pilot-tool__error">{error}</p> : null}
            <div className="pilot-modal__actions">
              <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={stage === "drafting" || !recipient.brandName.trim()}><IconSparkles stroke={1.5} aria-hidden />{stage === "drafting" ? "Drafting…" : "Draft the brief"}</button>
            </div>
            <p className="pilot-share__note">BLTZ fills in the facts (reach, brands, Locker placements, planned activations and upcoming dates) from your workspace. AI writes the pitch; you edit everything before sharing. Private contact details are never included.</p>
          </form>
        ) : null}

        {(stage === "edit" || stage === "sharing") && narrative && shownFacts ? (
          <form className="pilot-brief-builder__form" onSubmit={(event) => void share(event)}>
            <div className="pilot-brief-builder__tabs" role="tablist" aria-label="View">
              <button type="button" role="tab" aria-selected={!showPreview} className={cn("pilot-chip", !showPreview && "pilot-chip--on")} onClick={() => setShowPreview(false)}><IconFileText stroke={1.5} aria-hidden />Edit</button>
              <button type="button" role="tab" aria-selected={showPreview} className={cn("pilot-chip", showPreview && "pilot-chip--on")} onClick={() => setShowPreview(true)}><IconEye stroke={1.5} aria-hidden />Preview</button>
            </div>
            {notice ? <p className="pilot-signal-add__badge">{notice}</p> : aiDrafted ? <p className="pilot-signal-add__badge"><IconSparkles stroke={1.5} aria-hidden />Drafted with AI. Numbers come from your workspace; check the wording.</p> : null}

            {showPreview ? (
              <div className="pilot-brief-builder__preview"><BriefDocument content={{ recipient, facts: shownFacts, narrative }} /></div>
            ) : (
              <>
                <label className="pilot-field">Headline<input required maxLength={160} value={narrative.headline} onChange={(event) => setNarrative({ ...narrative, headline: event.target.value })} /></label>
                <label className="pilot-field">Introduction<textarea required rows={3} maxLength={1500} value={narrative.summary} onChange={(event) => setNarrative({ ...narrative, summary: event.target.value })} /></label>
                <label className="pilot-field">Why it fits {recipient.brandName}<textarea required rows={3} maxLength={1500} value={narrative.fit} onChange={(event) => setNarrative({ ...narrative, fit: event.target.value })} /></label>
                <fieldset className="pilot-brief-builder__group">
                  <legend>Partnership ideas</legend>
                  {narrative.ideas.map((idea, index) => (
                    <div key={index} className="pilot-brief-builder__idea">
                      <input aria-label="Idea title" required maxLength={120} value={idea.title} onChange={(event) => setIdea(index, { title: event.target.value })} />
                      <div className="pilot-signal-add__row">
                        <input aria-label="Channel" required maxLength={80} value={idea.channel} onChange={(event) => setIdea(index, { channel: event.target.value })} />
                        <input aria-label="Timing" required maxLength={80} value={idea.timing} onChange={(event) => setIdea(index, { timing: event.target.value })} />
                      </div>
                      <textarea aria-label="Description" required rows={2} maxLength={600} value={idea.description} onChange={(event) => setIdea(index, { description: event.target.value })} />
                      <button type="button" className="pilot-text-button" onClick={() => setNarrative({ ...narrative, ideas: narrative.ideas.filter((_, at) => at !== index) })}><IconTrash stroke={1.5} aria-hidden />Remove idea</button>
                    </div>
                  ))}
                  {narrative.ideas.length < 5 ? <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => setNarrative({ ...narrative, ideas: [...narrative.ideas, { title: "", channel: "", timing: "Any time", description: "" }] })}><IconPlus stroke={1.5} aria-hidden />Add an idea</button> : null}
                </fieldset>
                <fieldset className="pilot-brief-builder__group">
                  <legend>Brands and businesses</legend>
                  {shownFacts.brands.length ? <ul className="pilot-brief-builder__brands">{shownFacts.brands.map((brand) => {
                    const added = partners.some((partner) => partner.name === brand.name);
                    return <li key={brand.name}><span>{brand.name}{brand.note ? <small>{brand.note}</small> : null}</span>{added ? <button type="button" className="pilot-text-button" onClick={() => setPartners(partners.filter((partner) => partner.name !== brand.name))}>Remove</button> : <small>From your workspace</small>}</li>;
                  })}</ul> : <p className="pilot-quiet">None on file. Add past or current partners below.</p>}
                  <div className="pilot-brief-builder__add">
                    <input aria-label="Partner name" maxLength={120} value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="Past or current partner" />
                    <button type="button" className="pilot-pill pilot-pill--quiet" disabled={!partnerName.trim() || partners.length >= 10} onClick={() => { setPartners([...partners, { name: partnerName.trim(), note: null }]); setPartnerName(""); }}><IconPlus stroke={1.5} aria-hidden />Add</button>
                  </div>
                </fieldset>
              </>
            )}

            <div className="pilot-brief-builder__share">
              <label className="pilot-field">Link works for<select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value) as 7 | 30 | 90)}>
                <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
              </select></label>
              <label className="pilot-check pilot-brief-builder__consent">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
                <span>{playerName} approved sharing their name, image and these numbers with {recipient.brandName}.</span>
              </label>
            </div>
            {error ? <p role="alert" className="pilot-tool__error">{error}</p> : null}
            <div className="pilot-modal__actions">
              <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => setStage("recipient")}>Back</button>
              <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={stage === "sharing" || !consent}>{stage === "sharing" ? "Creating link" : "Create private link"}</button>
            </div>
          </form>
        ) : null}

        {stage === "shared" && link ? (
          <div className="pilot-brief-builder__done">
            <span className="pilot-brief-builder__check" aria-hidden><IconCheck stroke={2} /></span>
            <p><strong>Brief ready for {recipient.brandName}.</strong> The link works until {new Date(link.expiresAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}. You will see when it is opened.{preview ? " (Template: no real link is created.)" : ""}</p>
            <div className="pilot-brief-builder__link"><code>{link.url}</code></div>
            <div className="pilot-share__send-row">
              <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" onClick={async () => { try { await navigator.clipboard.writeText(link.url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } }}>{copied ? <IconCheck stroke={1.5} aria-hidden /> : <IconCopy stroke={1.5} aria-hidden />}{copied ? "Copied" : "Copy link"}</button>
              <a className="pilot-pill pilot-pill--quiet" href={mail}><IconMail stroke={1.5} aria-hidden />Email it</a>
              {!preview ? <a className="pilot-pill pilot-pill--quiet" href={link.url} target="_blank" rel="noopener noreferrer"><IconExternalLink stroke={1.5} aria-hidden />Open the brief</a> : null}
            </div>
            <p className="pilot-share__note">Opening the link yourself counts as a view.</p>
          </div>
        ) : null}
      </div>
    </div>,
    host,
  );
}
