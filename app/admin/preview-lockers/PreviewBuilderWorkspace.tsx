"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Search, UserRound } from "lucide-react";
import type { BuilderContext } from "./builder-workspace-data";
import styles from "./builder-workspace.module.css";

export default function PreviewBuilderWorkspace({ context, selectedId, athleteName, children }: {
  context: BuilderContext; selectedId?: string; athleteName?: string; children: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const athletes = context.athletes.filter(row => [row.full_name, row.school, row.position, row.level].some(value => value?.toLocaleLowerCase().includes(query)));
  const claim = context.claim?.preview_id === selectedId ? context.claim : null;
  const referrals = context.referrals.filter(row => row.referrer_preview_id === selectedId);
  return <section className={styles.workspace}>
    <header className={styles.header}><div><span className={styles.eyebrow}>BLTZ / Private previews</span><h1>Preview locker builder</h1><p>Build the athlete’s career, review their feedback, and prepare the next preview.</p></div><Link href="/admin/preview-lockers" className={styles.headerLink}>Saved previews<ArrowUpRight size={16} aria-hidden="true" /></Link></header>
    <div className={styles.columns}>
      <aside className={styles.rail} aria-label="Athlete preview search">
        <div className={styles.railHeader}><UserRound size={17} aria-hidden="true" /><h2>Athletes</h2><span className={styles.count}>{context.athletes.length}</span></div>
        <div className={styles.search}><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search athletes with preview lockers" placeholder="Search athlete, school…" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <div className={styles.roster}>
          {context.rosterUnavailable ? <p role="alert" className={styles.empty}>Athletes could not be loaded. Reload this page to try again.</p> : !athletes.length ? <p role="status" className={styles.empty}>{query ? "No athletes match this search. Try their name or school." : "No saved previews yet. Create a private preview to begin."}</p> : <ul>{athletes.map(row => <li key={row.id}><Link href={`/admin/preview-lockers/${row.id}/edit`} aria-current={row.id === selectedId ? "page" : undefined} className={styles.athlete}><span className={styles.initials} aria-hidden="true">{row.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("")}</span><span><strong>{row.full_name}</strong><small>{[row.position, row.school].filter(Boolean).join(" · ") || "Career details pending"}</small></span><ArrowUpRight size={14} aria-hidden="true" /></Link></li>)}</ul>}
        </div>
        <div className={styles.railFooter}><Link href="/admin/preview-lockers/new">+ Create private preview</Link><p>{athletes.length} of {context.athletes.length} athletes</p></div>
      </aside>
      <section className={styles.editor} aria-label="Selected athlete locker editor">
        <div className={styles.editorHeader}><div><span className={styles.eyebrow}>{selectedId ? "Selected athlete" : "New preview"}</span><h2>{athleteName || "Create private preview"}</h2></div><span className={styles.privateLabel}>Private workspace</span></div>
        <div className={styles.editorBody}>{children}</div>
      </section>
      <aside className={styles.rail} aria-label="Selected athlete claim feedback">
        <div className={styles.railHeader}><ClipboardCheck size={17} aria-hidden="true" /><h2>Claim feedback</h2></div>
        <div className={styles.feedback} key={selectedId || "new"}>
          <span className={styles.eyebrow}>{athleteName || "New preview"}</span>
          {context.feedbackUnavailable ? <p role="alert" className={styles.empty}>Claim feedback could not be loaded. Reload this page to try again. Your editor is still available.</p> : !claim ? <div className={styles.empty}><ClipboardCheck size={25} aria-hidden="true" /><h3>No claim response yet</h3><p>{selectedId ? "Feedback and decisions will appear here when this athlete submits the locker claim form." : "Save and share this athlete’s preview to receive claim feedback."}</p></div> : <>
            <section className={styles.feedbackSection}><h3>Claim decision</h3><strong className={styles.decision}>{claim.state === "accepted" ? "Locker interest submitted" : "Preview declined"}</strong><p><time dateTime={claim.created_at}>{new Date(claim.created_at).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}</time></p><dl><div><dt>Contact email</dt><dd>{claim.email || "Not provided"}</dd></div><div><dt>Updates permission</dt><dd>{claim.updates_permission ? "Granted" : "Not granted"}</dd></div><div><dt>Dashboard meeting</dt><dd>{claim.dashboard_interest ? "Requested" : "Not requested"}</dd></div></dl></section>
            <section className={styles.feedbackSection}><h3>Feedback & requests</h3><p className={styles.feedbackText}>{claim.feature_requests || claim.decline_reason || "No written feedback provided."}</p></section>
            <section className={styles.feedbackSection}><h3>Suggested athletes <span className={styles.count}>{referrals.length}</span></h3>{referrals.length ? <ul className={styles.referrals}>{referrals.map(row => <li key={row.id}><strong>{row.full_name}</strong><p>{row.email || "No email provided"}</p>{row.phone && <p>{row.phone}</p>}</li>)}</ul> : <p>No referrals submitted.</p>}</section>
          </>}
        </div>
        <div className={styles.railFooter}><Link href="/admin/preview-lockers/requests">All locker requests<ArrowUpRight size={14} aria-hidden="true" /></Link><p>Claim interest does not verify identity or media rights.</p></div>
      </aside>
    </div>
  </section>;
}
