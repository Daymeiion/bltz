import Link from "next/link";
import {
  IconArrowUpRight,
  IconBolt,
  IconBuildingStadium,
  IconCalendarEvent,
  IconChartArcs,
  IconChecklist,
  IconChevronRight,
  IconFileAnalytics,
  IconPhoto,
  IconShieldCheck,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface OrganizationDashboardOverviewProps {
  organizationName: string;
  organizationId?: string;
  teamCount: number;
  seasonCount: number;
  preview?: boolean;
}

function destination(organizationId: string | undefined, preview: boolean, segment: string) {
  if (preview) return `/organization/preview/${segment}`;
  if (!organizationId || segment !== "dashboard") return null;
  return `/organization/${organizationId}/dashboard`;
}

function WorkspaceLink({
  href,
  children,
  prominent = false,
}: {
  href: string | null;
  children: React.ReactNode;
  prominent?: boolean;
}) {
  const className = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold outline-none transition-[transform,background-color,border-color] focus-visible:ring-2 focus-visible:ring-[#ffbb00] focus-visible:ring-offset-2",
    prominent
      ? "bg-[#ffbb00] text-[#111827] hover:-translate-y-0.5 hover:bg-[#ffc629]"
      : "border border-[#dfe3ea] bg-white text-[#111827] hover:border-[#111827]",
    !href && "cursor-not-allowed opacity-45",
  );

  if (!href) {
    return (
      <span aria-disabled="true" className={className} title="Available in a later build phase">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function OrganizationDashboardOverview({
  organizationName,
  organizationId,
  teamCount,
  seasonCount,
  preview = false,
}: OrganizationDashboardOverviewProps) {
  const hasOperationalContext = teamCount > 0 || seasonCount > 0;
  const mediaHref = destination(organizationId, preview, "media");
  const playersHref = destination(organizationId, preview, "players");
  const reportsHref = destination(organizationId, preview, "reports");

  return (
    <div className="mx-auto w-full max-w-[1540px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a7000]">
              Organization overview
            </p>
            {preview ? (
              <span className="rounded-full border border-[#e7d596] bg-[#fff8dc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a5900]">
                Preview data
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 font-[var(--font-oswald)] text-4xl font-bold leading-none tracking-[-0.025em] text-[#101a31] sm:text-5xl">
            Good morning, {organizationName}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#657084] sm:text-base">
            Start with the work that changes athlete readiness, media availability, and measurable value.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <WorkspaceLink href={reportsHref}>
            <IconFileAnalytics className="size-4" aria-hidden />
            Open reports
          </WorkspaceLink>
          <WorkspaceLink href={mediaHref} prominent>
            Review media
            <IconArrowUpRight className="size-4" aria-hidden />
          </WorkspaceLink>
        </div>
      </header>

      <section className="mt-10 overflow-hidden rounded-[28px] border border-[#e2e5eb] bg-white shadow-[0_22px_70px_rgba(16,26,49,0.08)]" aria-labelledby="briefing-title">
        <div className="flex flex-wrap items-center gap-8 border-b border-[#eceef2] px-6 sm:px-8">
          <div className="relative py-5 text-sm font-bold text-[#101a31]">
            Today
            <span className="absolute inset-x-0 bottom-0 h-1 rounded-t-full bg-[#ffbb00]" />
          </div>
          <span className="py-5 text-sm text-[#7b8493]">This week</span>
          <span className="py-5 text-sm text-[#7b8493]">Team health</span>
          <span className="ml-auto hidden items-center gap-2 py-5 text-xs font-semibold text-[#657084] sm:flex">
            <IconShieldCheck className="size-4 text-[#248a55]" aria-hidden />
            Organization access verified
          </span>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.35fr_0.65fr] xl:p-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#101a31] text-white">
                <IconBolt className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7000]">Operational briefing</p>
                <h2 id="briefing-title" className="mt-1 text-2xl font-bold tracking-[-0.025em] text-[#101a31] sm:text-3xl">
                  Three actions can move the roster forward
                </h2>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {[
                { label: "Review rights on 8 newly associated clips", owner: "Media operations", href: mediaHref, tone: "bg-[#fff4c7]" },
                { label: "Complete 4 athlete source verifications", owner: "Roster operations", href: playersHref, tone: "bg-[#e9f4ff]" },
                { label: "Prepare the weekly readiness summary", owner: "Analytics", href: reportsHref, tone: "bg-[#edf8f1]" },
              ].map((item, index) => {
                const content = (
                  <>
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-[#101a31]", item.tone)}>
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-[#101a31]">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-[#7b8493]">Owned by {item.owner}</span>
                    </span>
                    <IconChevronRight className="size-4 shrink-0 text-[#98a0ad]" aria-hidden />
                  </>
                );

                return item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#e8eaf0] bg-[#fbfbfc] px-4 outline-none transition hover:border-[#cbd1db] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#ffbb00]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={item.label} aria-disabled="true" className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#e8eaf0] bg-[#fbfbfc] px-4 opacity-60">
                    {content}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[24px] bg-[#101a31] p-6 text-white sm:p-8">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[60px] bg-[#ffbb00]" aria-hidden />
            <IconSparkles className="size-6 text-[#ffbb00]" aria-hidden />
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-[#ffcf4d]">Recommended next move</p>
            <h3 className="mt-3 text-2xl font-bold leading-tight">Resolve the oldest media-rights blockers first.</h3>
            <p className="mt-4 text-sm leading-6 text-[#b8c1d1]">
              Clearing high-confidence assets increases the usable media pool before new uploads add review work.
            </p>
            <div className="mt-8 border-t border-white/15 pt-5 text-xs leading-5 text-[#9da8ba]">
              Recommendation preview · Evidence and confidence appear in the detailed workspace.
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-9 grid gap-8 xl:grid-cols-[0.8fr_1.2fr]" aria-label="Workspace intelligence">
        <article className="rounded-[28px] border border-[#e2e5eb] bg-white p-6 shadow-[0_16px_48px_rgba(16,26,49,0.06)] sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7000]">Foundation</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em] text-[#101a31]">
                {hasOperationalContext ? "Workspace connected" : "Ready for team setup"}
              </h2>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff4c7] text-[#7a5900]">
              <IconBuildingStadium className="size-6" aria-hidden />
            </span>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#f5f6f8] p-5">
              <IconUsers className="size-5 text-[#647086]" aria-hidden />
              <p className="mt-6 text-3xl font-black tabular-nums text-[#101a31]">{teamCount}</p>
              <p className="mt-1 text-sm text-[#657084]">Mapped teams</p>
            </div>
            <div className="rounded-2xl bg-[#f5f6f8] p-5">
              <IconCalendarEvent className="size-5 text-[#647086]" aria-hidden />
              <p className="mt-6 text-3xl font-black tabular-nums text-[#101a31]">{seasonCount}</p>
              <p className="mt-1 text-sm text-[#657084]">Available seasons</p>
            </div>
          </div>
        </article>

        <article className="rounded-[28px] border border-[#e2e5eb] bg-white p-6 shadow-[0_16px_48px_rgba(16,26,49,0.06)] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7000]">Readiness movement</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em] text-[#101a31]">A calmer view of what is improving</h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#edf8f1] px-3 py-1.5 text-xs font-bold text-[#23774b]">
              <IconChartArcs className="size-4" aria-hidden />
              Verified snapshots
            </span>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              { icon: IconPhoto, label: "Media ready", value: preview ? "64%" : "Not measured", note: preview ? "32 of 50 reviewed assets" : "Available after Media Graph" },
              { icon: IconChecklist, label: "Actions complete", value: preview ? "72%" : "Not measured", note: preview ? "18 of 25 assigned actions" : "Available after workflows" },
              { icon: IconFileAnalytics, label: "Reports current", value: preview ? "80%" : "Not measured", note: preview ? "4 of 5 scheduled reports" : "Available after analytics" },
            ].map((metric) => {
              const MetricIcon = metric.icon;
              return (
                <div key={metric.label} className="rounded-2xl border border-[#e8eaf0] p-5">
                  <MetricIcon className="size-5 text-[#657084]" aria-hidden />
                  <p className="mt-6 text-xl font-black text-[#101a31]">{metric.value}</p>
                  <p className="mt-1 text-sm font-semibold text-[#27334a]">{metric.label}</p>
                  <p className="mt-2 text-xs leading-5 text-[#7b8493]">{metric.note}</p>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
