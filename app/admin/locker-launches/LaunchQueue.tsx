"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LAUNCH_STATUSES } from "@/lib/enterprise-crm/pilot/types";

export type QueueLaunch = { id: string; organizationId: string; school: string; playerName: string; existingPlayer: boolean; position: string | null; years: string | null; contactEmail: string | null; message: string | null; status: string; statusNote: string | null; createdAt: string };
export type QueueSchool = { id: string; name: string; status: string };
export type QueueMedia = { id: string; launchId: string | null; school: string; player: string | null; kind: string; title: string; url: string | null; description: string | null; occurredOn: string | null };

const STATUS_LABEL: Record<string, string> = { requested: "Requested", building: "Building", invited: "Invite sent", live: "Live", declined: "Declined" };
const panel = "rounded-md border border-neutral-300 bg-white p-5 dark:border-neutral-800 dark:bg-[#111318]";
const muted = "text-sm text-neutral-600 dark:text-neutral-400";

async function patch(url: string, body: unknown) {
  const response = await fetch(url, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("failed");
}

export function LaunchQueue({ schools, launches, media, unavailable }: { schools: QueueSchool[] | null; launches: QueueLaunch[]; media: QueueMedia[]; unavailable: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key); setError(null);
    try { await action(); router.refresh(); } catch { setError("That change could not be saved."); }
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-neutral-950 dark:text-neutral-50">
      <header>
        <h1 className="text-2xl font-semibold">School launches</h1>
        <p className={muted}>Build each request with the batch builder in Preview Lockers (name + college), then move it along. Approve school media before it goes on a Locker.</p>
      </header>
      {unavailable ? <p role="alert" className="text-sm text-amber-700">Some launch data could not be loaded. The launch migration may not be applied yet.</p> : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}

      <section className={panel} aria-label="Enrolled schools">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Enrolled schools</h2>
          <Link href="/organization/preview" className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700">Edit the school template</Link>
        </div>
        {schools === null ? <p role="alert" className="text-sm text-amber-700">The school list could not be loaded.</p>
          : schools.length === 0 ? <p className={muted}>No school is enrolled yet. The template shows what each school will see.</p> : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {schools.map((school) => (
              <li key={school.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold">{school.name}</p>
                  <p className={muted}>{school.status === "restricted" ? "Restricted" : "Active"} · {launches.filter((launch) => launch.organizationId === school.id).length} launch request(s)</p>
                </div>
                <Link href={`/organization/${school.id}/dashboard`} className="rounded bg-[#ffbb00] px-3 py-1.5 text-sm font-semibold text-black">Open dashboard</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={panel} aria-label="Launch requests">
        <h2 className="mb-3 text-lg font-semibold">Launch requests</h2>
        {launches.length === 0 ? <p className={muted}>No school has launched a Locker yet.</p> : (
          <ul className="space-y-4">
            {launches.map((launch) => (
              <li key={launch.id} className="border-t border-neutral-200 pt-4 first:border-0 first:pt-0 dark:border-neutral-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{launch.playerName} <span className={muted}>· {launch.school}</span></p>
                    <p className={muted}>{[launch.position, launch.years, launch.existingPlayer ? "Has a player record" : "New build"].filter(Boolean).join(" · ")} · {new Date(launch.createdAt).toLocaleDateString()}</p>
                    {launch.contactEmail ? <p className={muted}>Invite to: {launch.contactEmail}</p> : <p className={muted}>No email provided</p>}
                    {launch.message ? <p className="mt-1 text-sm">“{launch.message}”</p> : null}
                  </div>
                  <label className="text-sm">Status{" "}
                    <select className="ml-1 rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700" value={launch.status} disabled={busy === launch.id}
                      onChange={(event) => run(launch.id, () => patch(`/api/admin/locker-launches/${launch.id}`, { status: event.target.value }))}>
                      {LAUNCH_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
                    </select>
                  </label>
                </div>
                {media.filter((item) => item.launchId === launch.id).length ? <p className={`${muted} mt-2`}>{media.filter((item) => item.launchId === launch.id).length} media item(s) waiting for review below.</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={panel} aria-label="Media review">
        <h2 className="mb-3 text-lg font-semibold">School media to review</h2>
        {media.length === 0 ? <p className={muted}>Nothing waiting.</p> : (
          <ul className="space-y-3">
            {media.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3 first:border-0 first:pt-0 dark:border-neutral-800">
                <div className="min-w-0">
                  <p className="font-medium">{item.kind}: {item.url ? <a className="underline" href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a> : item.title}</p>
                  <p className={muted}>{item.school}{item.player ? ` · ${item.player}` : item.launchId ? " · launch request" : ""}{item.occurredOn ? ` · ${item.occurredOn}` : ""}{item.description ? ` · ${item.description}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded bg-[#ffbb00] px-3 py-1.5 text-sm font-semibold text-black" disabled={busy === item.id} onClick={() => run(item.id, () => patch(`/api/admin/locker-launches/media/${item.id}`, { reviewStatus: "approved" }))}>Approve</button>
                  <button type="button" className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700" disabled={busy === item.id} onClick={() => run(item.id, () => patch(`/api/admin/locker-launches/media/${item.id}`, { reviewStatus: "rejected" }))}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
