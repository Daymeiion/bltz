import Link from "next/link";
import type { loadPreviewFunnelReport } from "@/lib/analytics/preview-funnel";

type Report = Awaited<ReturnType<typeof loadPreviewFunnelReport>>;
const panel = "rounded-xl border border-neutral-200 bg-white dark:border-slate-800 dark:bg-[#0c1524]";
const control = "min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-slate-700 dark:bg-[#101c2e]";
const muted = "text-neutral-500 dark:text-slate-400";
const labels: Record<string, string> = {
  locker_view: "Locker views", photos_view: "Photo room visits", film_view: "Film room visits",
  photo_open: "Photos opened", video_open: "Videos opened", video_play: "Native video plays",
  video_progress: "Native video milestones", video_complete: "Native videos completed",
  stats_view: "Stats viewed", claim_click: "Claim clicks", accepted: "Interest accepted",
  claim_submit: "Claim interest submitted", declined: "Interest declined", sent: "Invitation marked sent",
  dashboard_interest: "Dashboard requested", booking_click: "Booking link clicked",
  booking_confirmed: "Booking recorded by staff", walkthrough_completed: "Walkthrough recorded by staff",
  referral_link_copied: "Preview link copied", referral_created: "Referral link created",
  referral_copied: "Referral link copied", referral_submit: "Referral intake saved",
  referred_prepared: "Referred preview prepared", referred_claimed: "Referred claim interest",
  email_smtp_accepted: "Invitation accepted by SMTP", email_delivery_delayed: "Invitation delivery delayed",
  email_delivery_reported: "Invitation delivery reported", email_bounced: "Invitation bounced",
  email_send_failed: "Invitation send failed", email_send_uncertain: "Invitation send outcome uncertain",
};
const headlineKinds = ["locker_view", "photos_view", "film_view", "photo_open", "video_open", "video_play", "stats_view", "claim_click", "accepted", "claim_submit"];
const states: [keyof Report["delivery"]["eventCountsByState"], string, string][] = [
  ["queued", "Queued", muted], ["pending", "Pending", muted], ["published", "Published to QStash", "text-blue-700 dark:text-blue-300"],
  ["processing", "Processing", "text-blue-700 dark:text-blue-300"], ["retry", "Waiting to retry", "text-amber-700 dark:text-amber-300"],
  ["acknowledged", "Acknowledged by Tinybird", "text-emerald-700 dark:text-emerald-300"],
  ["quarantined", "Quarantined", "text-rose-700 dark:text-rose-300"], ["dead_letter", "Dead letter", "text-rose-700 dark:text-rose-300"],
  ["unknown", "Status unavailable", "text-amber-700 dark:text-amber-300"],
];
function date(value: string | null) {
  if (!value) return "Not yet";
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value) ? value.replace(" ", "T") + "Z" : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? "Unavailable" : parsed.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }) + " UTC";
}
function count(value: number) { return value.toLocaleString("en-US"); }
function age(seconds: number | null) {
  if (seconds === null) return "No pending events in the sample";
  if (seconds < 60) return "Less than a minute";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
}

/** Read-only server-rendered reporting. No provider credentials enter client props. */
export function PreviewActivityPanel({ report, query }: { report: Report; query: Record<string, string | undefined> }) {
  const selected = report.selectedPreview;
  const activityAvailable = report.activity.status === "available" && !report.activity.truncated;
  const deliveryAvailable = report.delivery.status === "available";
  const byKind = new Map(report.activity.metrics.map(metric => [metric.eventKind, metric]));
  const lockerSessions = byKind.get("locker_view")?.tabSessionCount;
  const noActivity = activityAvailable && report.activity.metrics.every(metric => metric.eventCount === 0);
  return <section className={`${panel} overflow-hidden`} aria-labelledby="preview-activity-heading">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 p-5 dark:border-slate-800">
      <div><p className={`text-xs uppercase tracking-widest ${muted}`}>Player preview tracking</p><h2 id="preview-activity-heading" className="mt-1 text-xl font-semibold">Locker activity and analytics delivery</h2><p className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}>Read player engagement alongside the delivery queue. The invitation cohort below remains a separate operational view.</p></div>
      <form action="/admin/gtm/funnel" method="get" className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
        {["campaign", "channel", "source", "since", "until"].map(key => query[key] ? <input key={key} type="hidden" name={key} value={query[key]} /> : null)}
        <label className="min-w-0 flex-1 text-xs font-medium">Player preview<select className={`${control} mt-1 w-full sm:min-w-64`} name="activity_preview" defaultValue={selected?.id ?? ""} disabled={!report.previews.length}>
          {!selected && <option value="">Select a shared preview</option>}
          {report.previews.map(preview => <option key={preview.id} value={preview.id}>{preview.label}{preview.access === "private" ? " · assigned private invitation" : preview.access === "unavailable" ? " · private access unavailable" : preview.access === "unshared" ? " · not shared" : ""}</option>)}
        </select></label><button type="submit" disabled={!report.previews.length} className={`${control} font-semibold disabled:opacity-50`}>View activity</button>
      </form>
    </div>
    {report.previewsTruncated && <p role="alert" className="border-b border-amber-500 p-4 text-sm text-amber-700 dark:text-amber-300">The preview selector reached its safety limit. Some previews may not appear.</p>}
    {report.selectionStatus !== "ready" ? <div className="p-5" role={report.selectionStatus === "unavailable" ? "alert" : "status"}>
      <h3 className="font-semibold">{report.selectionStatus === "empty" ? "No shared previews yet" : report.selectionStatus === "unshared" ? "This preview is not shared" : report.selectionStatus === "invalid" ? "Choose a valid player preview" : "Preview activity unavailable"}</h3>
      <p className={`mt-2 text-sm ${muted}`}>{report.selectionStatus === "empty" ? "Publish a public preview or assign its protected invitation to see it here. Future shared lockers will be included automatically." : report.selectionStatus === "unshared" ? "Draft activity is excluded. Choose a public preview or an assigned private invitation." : report.selectionStatus === "invalid" ? "The requested preview could not be selected. Choose a preview from the list." : "The reporting data could not be loaded. No missing data has been counted as zero; try again later."}</p>
    </div> : selected && <div className="space-y-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{selected.label}</h3><p className={`mt-1 text-xs ${muted}`}>{selected.access === "private" ? "Assigned private invitation" : "Published public preview"} · {report.environment ?? "Environment unavailable"} · Last refreshed {date(report.generatedAt)}</p></div><div className="flex flex-wrap gap-2"><Link href={`/admin/preview-lockers/${selected.id}/edit`} className={`${control} inline-flex items-center`}>Manage preview</Link>{selected.access === "public" && <Link href={`/preview-lockers/${selected.slug}`} className={`${control} inline-flex items-center`}>Open preview</Link>}</div></div>
      {selected.access === "private" && <p className={`text-xs leading-5 ${muted}`}>This report does not verify whether the private invitation has expired. A viewer assignment enables historical reporting here; it does not grant viewing access.</p>}
      <section aria-labelledby="preview-engagement-heading">
        <h4 id="preview-engagement-heading" className="font-semibold">Player engagement</h4><p className={`mt-1 text-xs leading-5 ${muted}`}>Report window: {date(report.windowStart)} through {date(report.windowEnd)}. Repeat interactions count as events; tab sessions are not people.</p>
        {!activityAvailable ? <p role="alert" className="mt-4 rounded-lg border border-amber-500 p-4 text-sm text-amber-700 dark:text-amber-300">{report.activity.truncated ? "The activity safety limit was reached. Engagement totals are withheld because the report is incomplete." : "Player engagement is unavailable. Counts are not shown as zero. Refresh after the reporting connection recovers."}</p> : <>
          {noActivity && <p role="status" className={`mt-4 text-sm ${muted}`}>No player activity has reached this report window yet. Admin, test and bot activity is excluded.</p>}
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">{headlineKinds.map(kind => <div key={kind} className="border-l-2 border-neutral-200 pl-3 dark:border-slate-700"><dt className={`text-xs ${muted}`}>{labels[kind]}</dt><dd className="mt-1 font-mono text-2xl font-semibold">{count(byKind.get(kind)?.eventCount ?? 0)}</dd></div>)}</dl>
          <p className={`mt-4 text-xs leading-5 ${muted}`}>Locker viewing tab sessions: <strong className="font-mono">{lockerSessions === null ? "Unavailable" : count(lockerSessions ?? 0)}</strong>. Saved claim interest does not verify identity or Locker ownership.</p>
          <details className="mt-4 border-t border-neutral-200 pt-3 dark:border-slate-800"><summary className="cursor-pointer text-sm font-semibold">All recorded preview measures</summary>{report.activity.metrics.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[360px] text-left text-sm"><caption className={`pb-3 text-left text-xs ${muted}`}>Delivery to Tinybird can lag accepted activity. Sessions across different measures must not be added together.</caption><thead className={`text-xs ${muted}`}><tr><th className="py-2">Measure</th><th className="py-2">Events</th><th className="py-2">Tab sessions</th></tr></thead><tbody>{report.activity.metrics.map(metric => <tr key={metric.eventKind} className="border-t border-neutral-100 dark:border-slate-800"><th className="py-2 font-normal">{labels[metric.eventKind] ?? metric.eventKind}</th><td className="font-mono">{count(metric.eventCount)}</td><td className="font-mono">{metric.tabSessionCount === null ? "Unavailable across media groups" : count(metric.tabSessionCount)}</td></tr>)}</tbody></table></div> : <p className={`mt-3 text-sm ${muted}`}>No recorded measures in this window.</p>}</details>
          <p className={`mt-3 text-xs ${muted}`}>Latest reported player event: {date(report.activity.eventWatermark)}</p>
        </>}
      </section>
      <section className="border-t border-neutral-200 pt-5 dark:border-slate-800" aria-labelledby="preview-delivery-heading">
        <h4 id="preview-delivery-heading" className="font-semibold">Analytics delivery status</h4><p className={`mt-1 text-xs leading-5 ${muted}`}>QStash transports accepted events to Tinybird. An analytics acknowledgment is not proof an invitation email was delivered.</p>
        {!deliveryAvailable ? <p role="alert" className="mt-4 rounded-lg border border-amber-500 p-4 text-sm text-amber-700 dark:text-amber-300">Delivery status is unavailable. Missing registry data is not counted as an empty queue.</p> : <>
          {report.delivery.truncated && <p role="alert" className="mt-4 rounded-lg border border-amber-500 p-4 text-sm text-amber-700 dark:text-amber-300">Delivery states cover only the latest {count(report.delivery.sampledEvents)} accepted preview events. Older events may still be pending; these are sample counts, not complete totals.</p>}
          <p className={`mt-4 text-xs ${muted}`}>{report.delivery.acceptedEventsTotal === null ? "Accepted event total unavailable" : `${count(report.delivery.acceptedEventsTotal)} accepted events in this report window’s delivery registry`} · State counts from the latest {count(report.delivery.sampledEvents)} events for this preview.</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{states.map(([state, label, color]) => <div key={state} className="border-l-2 border-neutral-200 pl-3 dark:border-slate-700"><dt className={`text-xs ${color}`}>{label}</dt><dd className={`mt-1 font-mono text-xl font-semibold ${color}`}>{count(report.delivery.eventCountsByState[state])}</dd></div>)}</dl>
          <dl className={`mt-5 grid gap-3 text-xs sm:grid-cols-3 ${muted}`}><div><dt>Latest event accepted</dt><dd className="mt-1">{date(report.delivery.acceptedAtWatermark)}</dd></div><div><dt>Latest analytics acknowledgment</dt><dd className="mt-1">{date(report.delivery.acknowledgedAtWatermark)}</dd></div><div><dt>Oldest pending event age</dt><dd className="mt-1">{age(report.delivery.oldestPendingAgeSeconds)}</dd></div></dl>
          <p className={`mt-3 text-xs leading-5 ${muted}`}>The latest acknowledgment is a timestamp, not a guarantee that all earlier events were delivered. Check pending, retry and failure states for gaps.</p>
        </>}
      </section>
      <p className={`border-t border-neutral-200 pt-4 text-xs leading-5 dark:border-slate-800 ${muted}`}>Invitation email and bounce evidence appears separately below. Verified ownership and provider-confirmed appointments are not connected to this activity report. Protected invitation bookings and referrals remain in the cohort below. External video opens do not prove YouTube playback.</p>
    </div>}
  </section>;
}
