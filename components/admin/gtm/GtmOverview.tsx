import {
  IconArrowRight, IconBolt, IconCalendarDue, IconMessageCircle,
  IconRosetteDiscountCheck, IconTargetArrow, IconUsersGroup,
} from "@tabler/icons-react";
import Link from "next/link";
import type { GtmContactRow, GtmContactsReadModel, GtmMetrics } from "@/lib/gtm/server";
import { GTM_PIPELINE_STAGES } from "@/lib/gtm/types";
import { GtmNavigation } from "@/components/admin/gtm/GtmNavigation";
import { cn } from "@/lib/utils";

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", includeTime
    ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric" }).format(parsed);
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function ContactLink({ contact, detail }: { contact: GtmContactRow; detail: string }) {
  return (
    <Link href={`/admin/gtm/contacts?contact=${contact.id}`} className="group flex min-h-14 items-center justify-between gap-4 rounded-xl px-3 py-2 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:hover:bg-neutral-800">
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold group-hover:underline">{contact.displayName}</span>
        <span className="mt-0.5 block truncate text-xs text-neutral-500">{detail}</span>
      </span>
      <IconArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
    </Link>
  );
}

function EmptyList({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-8 text-center text-sm leading-6 text-neutral-500">{children}</p>;
}

export function GtmOverview({ data, metrics }: { data: GtmContactsReadModel; metrics: GtmMetrics | null }) {
  if (data.state === "restricted") {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-[1600px] items-center justify-center px-6">
        <div className="max-w-lg rounded-2xl border border-neutral-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <IconUsersGroup className="mx-auto h-7 w-7" />
          <h1 className="mt-4 text-2xl font-semibold">GTM access is restricted</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">Only authorized BLTZ administrators can read relationship intelligence.</p>
        </div>
      </div>
    );
  }

  const contacts = data.contacts;
  const now = Date.now();
  const needsAttention = contacts
    .filter((contact) => contact.nextActionAt && new Date(contact.nextActionAt).getTime() <= now)
    .sort((left, right) => String(left.nextActionAt).localeCompare(String(right.nextActionAt)))
    .slice(0, 6);
  const upcoming = contacts
    .filter((contact) => contact.nextActionAt && new Date(contact.nextActionAt).getTime() > now)
    .sort((left, right) => String(left.nextActionAt).localeCompare(String(right.nextActionAt)))
    .slice(0, 6);
  const priority = [...contacts]
    .filter((contact) => contact.isPriority || contact.priorityTier === "A")
    .sort((left, right) => (right.priorityScore ?? -1) - (left.priorityScore ?? -1))
    .slice(0, 6);
  const recentActivity = contacts
    .flatMap((contact) => contact.interactions.map((interaction) => ({ contact, interaction })))
    .sort((left, right) => right.interaction.interactionAt.localeCompare(left.interaction.interactionAt))
    .slice(0, 6);
  const stageCounts = Object.fromEntries(GTM_PIPELINE_STAGES.map((stage) => [stage, contacts.filter((contact) => contact.pipelineStage === stage).length]));
  const maxStage = Math.max(1, ...Object.values(stageCounts));
  const metricCards = metrics ? [
    ["Total relevant contacts", metrics.totalContacts, IconUsersGroup],
    ["Enterprise", metrics.enterpriseContacts, IconTargetArrow],
    ["Athletes", metrics.athleteContacts, IconRosetteDiscountCheck],
    ["Multipliers", metrics.multiplierContacts, IconBolt],
    ["Priority contacts", metrics.priorityContacts, IconTargetArrow],
    ["Needs follow-up", metrics.contactsNeedingFollowUp, IconCalendarDue],
    ["Discovery conversations", metrics.discoveryConversations, IconMessageCircle],
    ["Demo candidates", metrics.demoCandidates, IconTargetArrow],
    ["Pilot candidates", metrics.pilotCandidates, IconTargetArrow],
    ["Active pilots", metrics.activePilots, IconBolt],
    ["Conversions", metrics.conversions, IconRosetteDiscountCheck],
  ] as const : [];

  return (
    <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <div className="flex flex-col gap-5 border-b border-neutral-300 pb-6 lg:flex-row lg:items-end lg:justify-between dark:border-neutral-800">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">GTM command view</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Relationship intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">See who needs attention, where momentum is building, and what BLTZ should do next.</p>
        </header>
        <GtmNavigation />
      </div>

      {data.state === "not_configured" || !metrics ? (
        <section className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="text-xl font-semibold">GTM instrumentation is not configured</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500">Deploy the approved GTM migrations before using private relationship metrics.</p>
        </section>
      ) : (
        <>
          <section aria-labelledby="gtm-scoreboard" className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Live portfolio</p><h2 id="gtm-scoreboard" className="mt-1 text-xl font-semibold">Executive scoreboard</h2></div>
              <p className="font-mono text-xs text-neutral-500">Updated {formatDate(metrics.generatedAt, true)}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-3 xl:grid-cols-6 dark:border-neutral-800 dark:bg-neutral-800">
              {metricCards.map(([name, value, Icon], index) => (
                <article key={name} className={cn("min-h-28 bg-white p-4 dark:bg-neutral-900", index === 0 && "sm:col-span-2 xl:col-span-1")}>
                  <div className="flex items-center justify-between"><Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" /><span className="h-1.5 w-1.5 rounded-full bg-[#ffbb00]" /></div>
                  <p className="mt-4 font-mono text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{name}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="needs-attention">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">Act now</p><h2 id="needs-attention" className="mt-1 text-xl font-semibold">Needs attention</h2></div><span className="font-mono text-2xl font-semibold">{needsAttention.length}</span></div>
              <div className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">{needsAttention.length ? needsAttention.map((contact) => <ContactLink key={contact.id} contact={contact} detail={`${contact.nextAction ?? "Follow up"} · due ${formatDate(contact.nextActionAt)}`} />) : <EmptyList>No overdue follow-ups.</EmptyList>}</div>
            </section>
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="upcoming-followups">
              <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Next up</p><h2 id="upcoming-followups" className="mt-1 text-xl font-semibold">Upcoming follow-ups</h2></div>
              <div className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">{upcoming.length ? upcoming.map((contact) => <ContactLink key={contact.id} contact={contact} detail={`${formatDate(contact.nextActionAt)} · ${contact.nextAction ?? "Next action"}`} />) : <EmptyList>No future follow-ups scheduled.</EmptyList>}</div>
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="recent-activity"><h2 id="recent-activity" className="text-lg font-semibold">Recent activity</h2><div className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">{recentActivity.length ? recentActivity.map(({ contact, interaction }) => <ContactLink key={interaction.id} contact={contact} detail={`${label(interaction.interactionType)} · ${formatDate(interaction.interactionAt, true)}`} />) : <EmptyList>No interactions logged yet.</EmptyList>}</div></section>
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="priority-contacts"><h2 id="priority-contacts" className="text-lg font-semibold">Priority contacts</h2><div className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">{priority.length ? priority.map((contact) => <ContactLink key={contact.id} contact={contact} detail={`${contact.priorityTier ? `Tier ${contact.priorityTier}` : "Priority"} · score ${contact.priorityScore ?? "not set"}`} />) : <EmptyList>No priority contacts marked.</EmptyList>}</div></section>
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="pipeline-summary"><h2 id="pipeline-summary" className="text-lg font-semibold">Pipeline summary</h2><div className="mt-4 space-y-3">{GTM_PIPELINE_STAGES.map((stage) => <div key={stage}><div className="flex items-center justify-between gap-3 text-xs"><span>{label(stage)}</span><span className="font-mono font-semibold">{stageCounts[stage]}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-full rounded-full bg-[#ffbb00]" style={{ width: `${(stageCounts[stage] / maxStage) * 100}%` }} /></div></div>)}</div></section>
          </div>
        </>
      )}
    </main>
  );
}
