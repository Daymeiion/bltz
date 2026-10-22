import Link from "next/link";
import { GtmPlayerConnections } from "@/components/admin/gtm/GtmPlayerConnections";
import type { GtmPlayerProspectsReadModel } from "@/lib/gtm/player-prospect-contract";

export function SelectedProspectsPanel({ data, contacts, enrollments, responses = [], inquiries = [], inquiriesLimited = false }: {
  data: GtmPlayerProspectsReadModel;
  contacts: { id: string; email: string | null }[];
  enrollments: { preview_id: string; is_test: boolean }[];
  responses?: { preview_id: string; state: string }[];
  inquiries?: { preview_id: string }[];
  inquiriesLimited?: boolean;
}) {
  return <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1524]" aria-labelledby="selected-prospects-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="selected-prospects-heading" className="text-xl font-semibold">Selected player cohort{data.state === "ready" ? ` · ${data.total}` : ""}</h2>
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold underline" href="/admin/gtm/players?view=selected">Manage selected players</Link>
    </div>
    <p className="mt-2 text-sm text-neutral-500">Selection and contact creation do not enroll a preview or send an invitation. Preview activity is available before enrollment. Enroll an existing preview below to track conversion responses and outreach attribution.</p>
    {data.state !== "ready" ? <p role="alert" className="mt-4">Selected players are unavailable. Check your access and try again.</p>
      : !data.rows.length ? <p className="mt-4 text-sm">No players selected yet. Choose players from Player Master.</p>
        : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead><tr className="border-b border-neutral-200 dark:border-slate-800">{["Player", "Contact", "Preview", "Conversion enrollment", "Responses", "Connections"].map(label => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead>
          <tbody>{data.rows.map(player => {
            const contact = contacts.find(row => row.id === player.contactId);
            const enrollment = enrollments.find(row => row.preview_id === player.previewId);
            const response = responses.find(row => row.preview_id === player.previewId);
            const inquiryCount = inquiries.filter(row => row.preview_id === player.previewId).length;
            return <tr key={player.gsisId} className="border-b border-neutral-200 align-top last:border-0 dark:border-slate-800">
              <th scope="row" className="px-3 py-3 font-semibold">{player.displayName}</th>
              <td className="px-3 py-3">{player.contactId ? <><Link className="underline" href={`/admin/gtm/contacts?contact=${player.contactId}`}>Open contact</Link><p className="mt-2 text-xs text-neutral-500">{contact?.email ? "Email recorded" : "No email recorded"}</p></> : "Not created"}</td>
              <td className="px-3 py-3">{player.previewId ? player.previewState === "complete" ? "Complete" : "Draft / incomplete" : "Not created"}</td>
              <td className="px-3 py-3">{enrollment ? enrollment.is_test ? "Test enrollment (excluded)" : "Enrolled" : "Not enrolled"}</td>
              <td className="px-3 py-3">{!player.previewId ? "No preview" : response ? response.state === "accepted" ? "Claim interest received" : response.state === "declined" ? "Declined" : "Response recorded" : inquiryCount ? `${inquiriesLimited ? "At least " : ""}${inquiryCount} unverified interest submission${inquiryCount === 1 ? "" : "s"}` : inquiriesLimited ? "Report incomplete" : "No response recorded"}</td>
              <td className="max-w-sm px-3 py-1"><GtmPlayerConnections gsisId={player.gsisId} preview={player.previewId ? { id: player.previewId, player_id: player.careerPlayerId } : null}/></td>
            </tr>;
          })}</tbody>
        </table>{inquiriesLimited && <p role="alert" className="mt-3 text-xs">The interest submission limit was reached; counts may be incomplete.</p>}{data.total > data.rows.length && <p className="mt-3 text-xs text-neutral-500">Showing the first {data.rows.length} of {data.total} selected players. Open Manage selected players for the full paginated list.</p>}</div>}
  </section>;
}
