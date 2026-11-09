"use client";

import { useState, type FormEvent } from "react";
import { IconBrandSlack, IconBrandTeams, IconBrandWordpress, IconCheck, IconPlugConnected } from "@tabler/icons-react";
import type { IntegrationKind, IntegrationStatus } from "@/lib/enterprise-crm/pilot/integrations-shared";
import { HeroTitle } from "./PilotMotion";
import { Bezel, Eyebrow } from "./PilotPrimitives";

type Tool = { kind: IntegrationKind; name: string; icon: typeof IconBrandSlack; does: string; steps: string[] };

const TOOLS: Tool[] = [
  { kind: "slack", name: "Slack", icon: IconBrandSlack, does: "Share sends activations to one channel your staff choose.",
    steps: ["In Slack, open the channel's settings, then Integrations, then Add an app.", "Add Incoming Webhooks and pick the channel.", "Copy the webhook link (it starts with https://hooks.slack.com/services/) and paste it here."] },
  { kind: "teams", name: "Microsoft Teams", icon: IconBrandTeams, does: "Share posts activations as a card in one Teams channel.",
    steps: ["In Teams, open the channel's menu (•••), then Workflows.", "Choose \"Post to a channel when a webhook request is received\" and finish the steps.", "Copy the link Teams shows at the end and paste it here."] },
  { kind: "wordpress", name: "Website (WordPress)", icon: IconBrandWordpress, does: "Publish on your site creates a draft post for your web team to review and publish.",
    steps: ["Sign in to your WordPress site as a user who can write posts.", "Go to Users, then Profile, then Application Passwords. Name it BLTZ and click Add.", "Paste your site address, that username and the new password here."] },
];

async function call(url: string, init: RequestInit): Promise<{ ok: boolean; body: Record<string, unknown> }> {
  const response = await fetch(url, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  return { ok: response.ok, body: await response.json().catch(() => ({})) };
}

/**
 * Settings for one school: connect the tools staff already use. Links and
 * passwords go to the server and are never shown again; only what is connected is.
 */
export function SchoolSettings({ organizationId, schoolName, initial, unavailable = false, preview = false }: {
  organizationId: string;
  schoolName: string;
  initial: IntegrationStatus[];
  unavailable?: boolean;
  preview?: boolean;
}) {
  const [connections, setConnections] = useState(initial);
  return (
    <div className="pilot-page pilot-settings">
      <header className="pilot-hero pilot-hero--compact">
        <Eyebrow>{schoolName}</Eyebrow>
        <HeroTitle text="Settings" />
        <p className="pilot-hero__lede">Connect the tools your staff already use, so sharing an activation lands where they work.</p>
      </header>
      {preview ? <p className="pilot-preview-note">Fictional preview · connections are not saved</p> : null}
      {unavailable ? <p role="alert" className="pilot-tool__error">Connections could not be loaded. The settings migration may not be applied yet.</p> : null}
      <div className="pilot-settings__grid">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.kind} tool={tool} organizationId={organizationId} preview={preview}
            connection={connections.find((row) => row.kind === tool.kind) ?? null}
            onChange={(next) => setConnections((current) => [...current.filter((row) => row.kind !== tool.kind), ...(next ? [next] : [])])} />
        ))}
      </div>
    </div>
  );
}

function ToolCard({ tool, connection, organizationId, preview, onChange }: { tool: Tool; connection: IntegrationStatus | null; organizationId: string; preview: boolean; onChange: (next: IntegrationStatus | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = tool.icon;
  const api = `/api/organization/${organizationId}/integrations`;

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const payload = tool.kind === "wordpress"
      ? { kind: tool.kind, siteUrl: value("siteUrl"), username: value("username"), appPassword: value("appPassword") }
      : { kind: tool.kind, webhookUrl: value("webhookUrl"), label: value("label") || null };
    setBusy(true); setError(null);
    if (preview) {
      onChange({ kind: tool.kind, label: tool.kind === "wordpress" ? value("siteUrl").replace(/^https?:\/\//, "") : value("label") || null, updatedAt: new Date().toISOString() });
      setEditing(false); setBusy(false); return;
    }
    const result = await call(api, { method: "PUT", body: JSON.stringify(payload) }).catch(() => ({ ok: false, body: {} as Record<string, unknown> }));
    setBusy(false);
    if (!result.ok) { setError(tool.kind === "wordpress" ? "Check the site address (https://…), username and application password." : `That is not a ${tool.name} webhook link. Copy it again from ${tool.name}.`); return; }
    onChange(result.body.integration as IntegrationStatus);
    setEditing(false);
  }

  async function disconnect() {
    setBusy(true); setError(null);
    const ok = preview ? true : (await call(`${api}?kind=${tool.kind}`, { method: "DELETE" }).catch(() => ({ ok: false, body: {} as Record<string, unknown> }))).ok;
    setBusy(false);
    if (!ok) { setError("Could not disconnect. Try again."); return; }
    onChange(null);
  }

  return (
    <Bezel as="section" label={tool.name} coreClassName="pilot-tool">
      <div className="pilot-tool__head">
        <span className="pilot-tool__icon" aria-hidden><Icon stroke={1.5} /></span>
        <div><h2>{tool.name}</h2><p>{tool.does}</p></div>
        {connection ? <span className="pilot-tool__status"><IconCheck stroke={2} aria-hidden />Connected</span> : null}
      </div>
      {connection && !editing ? (
        <div className="pilot-tool__connected">
          <p><IconPlugConnected stroke={1.5} aria-hidden />{connection.label ?? "Connected"} · since {new Date(connection.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
          <div className="pilot-tool__actions">
            <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => setEditing(true)}>Replace</button>
            <button type="button" className="pilot-text-button" disabled={busy} onClick={() => void disconnect()}>Disconnect</button>
          </div>
        </div>
      ) : editing || !connection ? (
        editing ? (
          <form className="pilot-tool__form" onSubmit={(event) => void connect(event)}>
            <ol className="pilot-tool__steps">{tool.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            {tool.kind === "wordpress" ? (
              <>
                <label className="pilot-field">Site address<input name="siteUrl" type="url" required placeholder="https://news.yourschool.edu" autoComplete="off" /></label>
                <label className="pilot-field">WordPress username<input name="username" required autoComplete="off" /></label>
                <label className="pilot-field">Application password<input name="appPassword" type="password" required placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" autoComplete="new-password" /></label>
              </>
            ) : (
              <>
                <label className="pilot-field">Webhook link<input name="webhookUrl" type="url" required autoComplete="off" placeholder={tool.kind === "slack" ? "https://hooks.slack.com/services/…" : "https://…"} /></label>
                <label className="pilot-field">Channel name (optional)<input name="label" maxLength={120} placeholder="#athletics-social" autoComplete="off" /></label>
              </>
            )}
            {error ? <p role="alert" className="pilot-tool__error">{error}</p> : null}
            <div className="pilot-tool__actions">
              <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => { setEditing(false); setError(null); }}>Cancel</button>
              <button type="submit" className="pilot-pill pilot-pill--primary pilot-pill--compact" disabled={busy}>{busy ? "Connecting" : `Connect ${tool.name}`}</button>
            </div>
          </form>
        ) : <button type="button" className="pilot-pill pilot-pill--primary pilot-pill--compact" onClick={() => setEditing(true)}>Connect {tool.name}</button>
      ) : null}
      {error && !editing ? <p role="alert" className="pilot-tool__error">{error}</p> : null}
    </Bezel>
  );
}
