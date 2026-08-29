"use client";

import {
  IconAddressBook,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconSearch,
  IconShieldLock,
  IconUserPlus,
  IconUsersGroup,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { promotePlayerMasterProspects, selectPlayerMasterProspects } from "@/app/admin/gtm/players/actions";
import { GtmNavigation } from "@/components/admin/gtm/GtmNavigation";
import {
  GTM_PLAYER_PROSPECT_SORTS,
  type GtmPlayerProspectsReadModel,
} from "@/lib/gtm/player-prospect-contract";
import { cn } from "@/lib/utils";

const inputClass = "min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:border-neutral-700 dark:bg-neutral-950";
const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200";
const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800";

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function pageHref(model: Extract<GtmPlayerProspectsReadModel, { state: "ready" }>, page: number) {
  const parameters = new URLSearchParams();
  const { filters } = model;
  if (filters.search) parameters.set("search", filters.search);
  if (filters.college) parameters.set("college", filters.college);
  if (filters.team) parameters.set("team", filters.team);
  if (filters.position) parameters.set("position", filters.position);
  if (filters.status) parameters.set("status", filters.status);
  if (filters.view !== "all") parameters.set("view", filters.view);
  if (filters.sort !== "name") parameters.set("sort", filters.sort);
  if (filters.direction !== "asc") parameters.set("direction", filters.direction);
  if (page > 1) parameters.set("page", String(page));
  const query = parameters.toString();
  return query ? `/admin/gtm/players?${query}` : "/admin/gtm/players";
}

function AccessState({ state }: { state: "not_configured" | "restricted" }) {
  const restricted = state === "restricted";
  return (
    <div className="mt-6 flex min-h-[28rem] items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <div className="max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
          {restricted ? <IconShieldLock className="h-6 w-6" /> : <IconUsersGroup className="h-6 w-6" />}
        </div>
        <h2 className="mt-5 text-xl font-semibold">{restricted ? "Player prospecting is restricted" : "Player Master is not configured"}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {restricted
            ? "An authorized BLTZ administrator is required to view relationship prospecting signals."
            : "Import the canonical Player Master and deploy the GTM prospect promotion migration before building a player cohort."}
        </p>
      </div>
    </div>
  );
}

export function GtmPlayerProspectsWorkspace({ data }: { data: GtmPlayerProspectsReadModel }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startPromotion] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const availableIds = data.state === "ready"
    ? data.rows.filter((row) => data.filters.view === "selected" ? !row.contactId : !row.selectedAt).map((row) => row.gsisId)
    : [];
  const allAvailableSelected = availableIds.length > 0 && availableIds.every((id) => selected.has(id));

  const togglePlayer = (gsisId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(gsisId);
      else next.delete(gsisId);
      return next;
    });
  };

  const togglePage = (checked: boolean) => {
    setSelected(checked ? new Set(availableIds) : new Set());
  };

  const selectProspects = (gsisIds: string[]) => {
    setNotice(null);
    startPromotion(async () => {
      const result = await selectPlayerMasterProspects({ gsisIds });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setSelected(new Set());
      setNotice(`${result.selectedCount.toLocaleString()} player${result.selectedCount === 1 ? "" : "s"} selected for the GTM prospect cohort${result.existingCount ? `; ${result.existingCount.toLocaleString()} already selected` : ""}.`);
      router.refresh();
    });
  };

  const promoteProspects = (gsisIds: string[]) => {
    setNotice(null);
    startPromotion(async () => {
      const result = await promotePlayerMasterProspects({ gsisIds });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setSelected(new Set());
      setNotice(`${result.createdCount.toLocaleString()} contact${result.createdCount === 1 ? "" : "s"} added to GTM${result.existingCount ? `; ${result.existingCount.toLocaleString()} already existed` : ""}. ${result.linkedPlayerCount.toLocaleString()} exact canonical Player match${result.linkedPlayerCount === 1 ? "" : "es"} verified.`);
      router.refresh();
    });
  };

  const runPrimaryAction = (gsisIds: string[]) => {
    if (data.state === "ready" && data.filters.view === "selected") promoteProspects(gsisIds);
    else selectProspects(gsisIds);
  };

  return (
    <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-8 text-neutral-950 sm:px-8 dark:text-white">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Canonical athlete discovery</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Player prospecting</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            Filter the Player Master, build a focused cohort, and select a private GTM prospect cohort without copying Player Master identity into contacts. No LinkedIn connection or public Locker is required.
          </p>
        </div>
        <GtmNavigation />
      </div>

      {data.state !== "ready" ? <AccessState state={data.state} /> : (
        <>
          <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="player-prospect-filters">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-2xl font-semibold">{data.total.toLocaleString()}</p>
                <h2 id="player-prospect-filters" className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{data.filters.view === "all" ? "Player Master results" : data.filters.view === "selected" ? "Selected prospect cohort" : "Players added to GTM Contacts"}</h2>
              </div>
              <p className="max-w-lg text-xs leading-5 text-neutral-500">College uses a contains match, so “California” can find school names containing California. Team and position use exact abbreviations.</p>
            </div>

            <form method="get" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <label className="lg:col-span-2"><span className="sr-only">Search player name</span><span className="relative block"><IconSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-400" /><input name="search" defaultValue={data.filters.search} placeholder="Search player name" className={cn(inputClass, "pl-9")} /></span></label>
              <label><span className="sr-only">College contains</span><input name="college" defaultValue={data.filters.college} placeholder="College contains" className={inputClass} /></label>
              <label><span className="sr-only">NFL team abbreviation</span><input name="team" defaultValue={data.filters.team} placeholder="Team (e.g. LAC)" className={inputClass} /></label>
              <label><span className="sr-only">Position abbreviation</span><input name="position" defaultValue={data.filters.position} placeholder="Position (e.g. WR)" className={inputClass} /></label>
              <label><span className="sr-only">Player status</span><input name="status" defaultValue={data.filters.status} placeholder="Status" className={inputClass} /></label>
              <label><span className="sr-only">Sort players</span><select name="sort" defaultValue={data.filters.sort} className={inputClass}>{GTM_PLAYER_PROSPECT_SORTS.map((sort) => <option key={sort} value={sort}>Sort: {label(sort)}</option>)}</select></label>
              <label><span className="sr-only">Sort direction</span><select name="direction" defaultValue={data.filters.direction} className={inputClass}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
                <button className={primaryButton} type="submit"><IconFilter className="h-4 w-4" />Apply filters</button>
                <Link href="/admin/gtm/players" className={secondaryButton}>Reset</Link>
              </div>
            </form>
            <nav className="mt-4 flex flex-wrap gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800" aria-label="Player GTM workflow views">
              {[["all", "All Player Master"], ["selected", "Selected prospects"], ["contacts", "Added contacts"]].map(([view, text]) => (
                <Link key={view} href={`/admin/gtm/players${view === "all" ? "" : `?view=${view}`}`} className={cn(secondaryButton, data.filters.view === view && "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950")}>{text}</Link>
              ))}
            </nav>
          </section>

          {notice && <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">{notice}</p>}

          <section className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900" aria-label="Player prospect results">
            <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
              {data.filters.view !== "contacts" && <label className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold">
                <input type="checkbox" checked={allAvailableSelected} disabled={availableIds.length === 0 || pending} onChange={(event) => togglePage(event.target.checked)} className="h-4 w-4" />
                {data.filters.view === "selected" ? "Select prospects to add to Contacts" : "Select available players on this page"}
              </label>}
              {data.filters.view !== "contacts" ? <button type="button" onClick={() => runPrimaryAction([...selected])} disabled={selected.size === 0 || pending} className={primaryButton}>
                <IconUserPlus className="h-4 w-4" />{pending ? "Saving…" : data.filters.view === "selected" ? `Add ${selected.size || "players"} to Contacts` : `Add ${selected.size || "players"} to prospect cohort`}
              </button> : <Link href="/admin/gtm/contacts" className={primaryButton}><IconAddressBook className="h-4 w-4" />Open Contacts</Link>}
            </div>

            {data.rows.length === 0 ? (
              <div className="flex min-h-[22rem] items-center justify-center p-8 text-center">
                <div className="max-w-md"><IconUsersGroup className="mx-auto h-8 w-8 text-neutral-400" /><h2 className="mt-4 text-xl font-semibold">No players match these filters</h2><p className="mt-2 text-sm text-neutral-500">Broaden the college, team, position, status, or name filter.</p></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full border-collapse text-left text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-[0.06em] text-neutral-500 dark:bg-neutral-950">
                    <tr><th className="w-12 px-4 py-3"><span className="sr-only">Select</span></th><th className="px-3 py-3">Player</th><th className="px-3 py-3">College</th><th className="px-3 py-3">Team</th><th className="px-3 py-3">Position</th><th className="px-3 py-3">Career</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">GTM</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {data.rows.map((player) => {
                      const added = Boolean(player.selectedAt);
                      const promoted = Boolean(player.contactId);
                      const selectable = data.filters.view === "selected" ? !promoted : !added;
                      return (
                        <tr key={player.gsisId} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50">
                          <td className="px-4 py-3">{data.filters.view !== "contacts" && <input type="checkbox" aria-label={`Select ${player.displayName}`} checked={selected.has(player.gsisId)} disabled={!selectable || pending} onChange={(event) => togglePlayer(player.gsisId, event.target.checked)} className="h-4 w-4" />}</td>
                          <td className="px-3 py-3"><p className="font-semibold">{player.displayName}</p><p className="mt-1 font-mono text-[11px] text-neutral-500">{player.gsisId}</p></td>
                          <td className="px-3 py-3"><p>{player.collegeName ?? "Not recorded"}</p>{player.collegeConference && <p className="mt-1 text-xs text-neutral-500">{player.collegeConference}</p>}</td>
                          <td className="px-3 py-3 font-semibold">{player.latestTeam ?? "—"}</td>
                          <td className="px-3 py-3">{player.position ?? "—"}</td>
                          <td className="px-3 py-3"><p>{player.yearsOfExperience == null ? "Experience unknown" : `${player.yearsOfExperience} ${player.yearsOfExperience === 1 ? "year" : "years"}`}</p><p className="mt-1 text-xs text-neutral-500">{player.rookieSeason ?? "?"}–{player.lastSeason ?? "present"}</p></td>
                          <td className="px-3 py-3">{player.status ? label(player.status) : "Not recorded"}</td>
                          <td className="px-4 py-3 text-right">
                            {promoted ? <Link href={`/admin/gtm/contacts?contact=${player.contactId}`} className={secondaryButton}><IconCheck className="h-4 w-4" />Open contact</Link> : added ? <button type="button" onClick={() => promoteProspects([player.gsisId])} disabled={pending} className={secondaryButton}><IconUserPlus className="h-4 w-4" />Add to Contacts</button> : <button type="button" onClick={() => selectProspects([player.gsisId])} disabled={pending} className={secondaryButton}><IconAddressBook className="h-4 w-4" />Add to cohort</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
              <p className="text-sm text-neutral-500">Page {data.page.toLocaleString()} of {data.pageCount.toLocaleString()} · {data.total.toLocaleString()} results</p>
              <div className="flex gap-2">
                {data.page > 1 ? <Link href={pageHref(data, data.page - 1)} className={secondaryButton}><IconChevronLeft className="h-4 w-4" />Previous</Link> : <span className={cn(secondaryButton, "cursor-not-allowed opacity-50")}><IconChevronLeft className="h-4 w-4" />Previous</span>}
                {data.page < data.pageCount ? <Link href={pageHref(data, data.page + 1)} className={secondaryButton}>Next<IconChevronRight className="h-4 w-4" /></Link> : <span className={cn(secondaryButton, "cursor-not-allowed opacity-50")}>Next<IconChevronRight className="h-4 w-4" /></span>}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

