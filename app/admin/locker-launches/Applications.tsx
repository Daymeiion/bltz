"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type QueueApplication = {
  id: string; organizationName: string; organizationKind: "school_athletics" | "nil_agency"; collegeName: string | null;
  applicantName: string; applicantEmail: string; applicantTitle: string | null; message: string | null;
  status: "pending" | "approved" | "declined"; schoolEmail: boolean; createdAt: string;
  /** College names in the master player list that look like this school, with player counts. */
  collegeOptions: Array<{ name: string; players: number }>;
};

const panel = "rounded-md border border-neutral-300 bg-white p-5 dark:border-neutral-800 dark:bg-[#111318]";
const muted = "text-sm text-neutral-600 dark:text-neutral-400";
const MESSAGE: Record<string, string> = {
  applicant_not_confirmed: "The applicant has not confirmed their email yet. Ask them to click the link in their confirmation email, then approve.",
  already_decided: "This application was already decided. Reload the page.",
  failed: "Something failed part-way. It is safe to press Approve again.",
};

/** Pilot applications from schools and agencies. Approving turns the workspace on and builds the roster. */
export function Applications({ applications, unavailable }: { applications: QueueApplication[]; unavailable: boolean }) {
  const pending = applications.filter((row) => row.status === "pending");
  const decided = applications.filter((row) => row.status !== "pending").slice(0, 10);
  return (
    <section className={panel} aria-label="Pilot applications">
      <h2 className="mb-1 text-lg font-semibold">Pilot applications{pending.length ? ` (${pending.length})` : ""}</h2>
      <p className={`${muted} mb-3`}>From the application page at /pilot. Approving gives the applicant their workspace and lists their former players from the master list.</p>
      {unavailable ? <p role="alert" className="text-sm text-amber-700">Applications could not be loaded. The onboarding migration may not be applied yet.</p>
        : pending.length === 0 ? <p className={muted}>No applications waiting.</p>
        : <ul className="space-y-5">{pending.map((application) => <ApplicationCard key={application.id} application={application} />)}</ul>}
      {decided.length ? (
        <details className="mt-4">
          <summary className={`${muted} cursor-pointer`}>Recently decided ({decided.length})</summary>
          <ul className="mt-2 space-y-1">{decided.map((row) => <li key={row.id} className={muted}>{row.organizationName} · {row.applicantEmail} · {row.status} · {new Date(row.createdAt).toLocaleDateString()}</li>)}</ul>
        </details>
      ) : null}
    </section>
  );
}

function ApplicationCard({ application }: { application: QueueApplication }) {
  const router = useRouter();
  const [college, setCollege] = useState(application.collegeOptions[0]?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const isSchool = application.organizationKind === "school_athletics";

  async function decide(body: Record<string, unknown>) {
    setBusy(true); setNotice(null);
    const response = await fetch(`/api/admin/pilot-applications/${application.id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const result = await response?.json().catch(() => ({})) as { state?: string; rosterAdded?: number };
    setBusy(false);
    if (response?.ok) { setNotice(result.state === "approved" ? `Approved. ${result.rosterAdded ?? 0} players added to their roster.` : "Declined."); router.refresh(); return; }
    setNotice(MESSAGE[result?.state ?? ""] ?? "That did not work. Try again.");
  }

  return (
    <li className="border-t border-neutral-200 pt-4 first:border-0 first:pt-0 dark:border-neutral-800">
      <p className="font-semibold">{application.organizationName} <span className={muted}>· {isSchool ? "School athletics" : "NIL agency"}{application.collegeName ? ` · ${application.collegeName}` : ""}</span></p>
      <p className={muted}>{application.applicantName}{application.applicantTitle ? `, ${application.applicantTitle}` : ""} · {application.applicantEmail} · {application.schoolEmail ? "school (.edu) email" : "not a .edu email: check who this is"} · applied {new Date(application.createdAt).toLocaleDateString()}</p>
      {application.message ? <p className="mt-1 text-sm">“{application.message}”</p> : null}
      {isSchool ? (
        <label className="mt-3 block text-sm">
          <span className="font-medium">Players come from this college in the master list</span>
          <input list={`colleges-${application.id}`} value={college} onChange={(event) => setCollege(event.target.value)} placeholder="Exact college name, e.g. California"
            className="mt-1 block w-full max-w-md rounded border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
          <datalist id={`colleges-${application.id}`}>{application.collegeOptions.map((option) => <option key={option.name} value={option.name}>{option.players} players</option>)}</datalist>
          <span className={`${muted} mt-1 block`}>{application.collegeOptions.length ? application.collegeOptions.map((option) => `${option.name} (${option.players})`).join(" · ") : "No close match found. Type the name exactly as the master list has it, or leave empty to add players later."}</span>
        </label>
      ) : <p className={`${muted} mt-2`}>Agencies start with an empty roster and add the athletes they represent.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} className="rounded bg-[#ffbb00] px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-60" onClick={() => void decide({ decision: "approve", masterListCollege: isSchool ? college.trim() || null : null })}>{busy ? "Working…" : "Approve"}</button>
        <button type="button" disabled={busy} className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700" onClick={() => { if (window.confirm(`Decline ${application.organizationName}?`)) void decide({ decision: "decline" }); }}>Decline</button>
      </div>
      {notice ? <p role="status" className="mt-2 text-sm">{notice}</p> : null}
    </li>
  );
}
