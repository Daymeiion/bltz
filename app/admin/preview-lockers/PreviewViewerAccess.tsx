"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PreviewViewerAccess({ previewId, initialAssigned }: { previewId: string; initialAssigned: boolean }) {
  const [assigned, setAssigned] = useState(initialAssigned);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialAssigned ? "One player account has private read-only access." : "No player account has access.");
  const [error, setError] = useState("");

  async function assign() {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/preview-lockers/${previewId}/viewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.error === "account_not_found") throw new Error("No existing BLTZ account matches that exact email. No viewer was assigned.");
        if (response.status === 401 || response.status === 403) throw new Error("Your Admin session is not authorized to assign this viewer.");
        throw new Error("Viewer assignment failed. Existing access was not changed.");
      }
      setAssigned(true); setEmail("");
      setMessage(result.status === "reassigned" ? "Player access was reassigned and audited." : result.status === "unchanged" ? "That player account already has access." : "One player account now has private read-only access. Assignment was audited.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Viewer assignment failed."); }
    finally { setBusy(false); }
  }

  async function revoke() {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/preview-lockers/${previewId}/viewer`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Your Admin session is not authorized to revoke this viewer." : "Viewer revocation failed. Existing access was not changed.");
      const result = await response.json(); setAssigned(false);
      setMessage(result.status === "no_viewer" ? "No player account had access." : "Player access was revoked and audited.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Viewer revocation failed."); }
    finally { setBusy(false); }
  }

  return <section className="space-y-4 rounded-lg border p-4" aria-labelledby="preview-viewer-heading">
    <div className="space-y-1"><h2 id="preview-viewer-heading" className="font-semibold">Private player viewer</h2><p className="text-sm">Assign exactly one existing BLTZ account by exact email. The address is used only for the account lookup and is not displayed or stored with this preview. Access is read-only for this Locker, Photos, and Film Room.</p></div>
    <p role="status" className="text-sm font-medium">{message}</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <label className="grid gap-2 text-sm">Player BLTZ account email<Input aria-label="Player BLTZ account email" type="email" autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>
    <div className="flex flex-wrap gap-3"><Button type="button" onClick={assign} disabled={busy || !email.trim()}>{assigned ? "Reassign player access" : "Assign player access"}</Button>{assigned && <Button type="button" variant="outline" onClick={revoke} disabled={busy}>Revoke player access</Button>}</div>
  </section>;
}
