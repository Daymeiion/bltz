"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import { createContext, useContext, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  IconBuildingStadium,
  IconBell,
  IconChartBar,
  IconChecklist,
  IconChevronDown,
  IconCoin,
  IconFileDescription,
  IconFilter,
  IconHelpCircle,
  IconLayoutDashboard,
  IconLock,
  IconLogout,
  IconMenu2,
  IconMessageCircle,
  IconPhoto,
  IconPalette,
  IconReportAnalytics,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconSpeakerphone,
  IconUserCircle,
  IconUsers,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AccessibleOrganization, OrganizationContext, OrganizationWorkspaceOptions } from "@/lib/organization/types";
import { OrganizationThemeProvider, useOrganizationTheme } from "./OrganizationTheme";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavigationIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

interface NavigationItem {
  label: string;
  segment: string;
  icon: NavigationIcon;
  productionAvailable?: boolean;
}

type WorkspaceChromeValue = {
  context: OrganizationContext;
  organizations: AccessibleOrganization[];
  options: OrganizationWorkspaceOptions;
  dark: boolean;
};

const WorkspaceChromeContext = createContext<WorkspaceChromeValue | null>(null);

const NAVIGATION: NavigationItem[] = [
  { label: "Overview", segment: "dashboard", icon: IconLayoutDashboard, productionAvailable: true },
  { label: "Players", segment: "players", icon: IconUsers },
  { label: "Media", segment: "media", icon: IconPhoto },
  { label: "Agreements", segment: "agreements", icon: IconFileDescription },
  { label: "Rights", segment: "rights", icon: IconShieldCheck },
  { label: "Approvals", segment: "approvals", icon: IconChecklist },
  { label: "Campaigns", segment: "campaigns", icon: IconSpeakerphone },
  { label: "Attribution", segment: "attribution", icon: IconChartBar },
  { label: "Reports", segment: "reports", icon: IconReportAnalytics },
  { label: "Messages", segment: "messages", icon: IconMessageCircle },
  { label: "Revenue", segment: "revenue", icon: IconCoin },
  { label: "Settings", segment: "settings", icon: IconSettings },
];

const PRIMARY_NAVIGATION: NavigationItem[] = [
  NAVIGATION[0],
  NAVIGATION[1],
  NAVIGATION[2],
  NAVIGATION[3],
  { label: "Finance", segment: "revenue", icon: IconCoin },
];

const RAIL_SEGMENTS = new Set(["dashboard", "players", "media", "agreements", "messages", "reports"]);

function formatCode(value: string): string {
  return value.split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function accessLabel(context: OrganizationContext): string {
  return context.access.scope === "platform" ? "Platform super admin" : formatCode(context.access.role);
}

function isPreviewPath(pathname: string): boolean {
  return pathname === "/organization/preview" || pathname.startsWith("/organization/preview/");
}

function navigationHref(organizationId: string, segment: string, preview: boolean): string {
  if (preview) return segment === "dashboard" ? "/organization/preview" : `/organization/preview/${segment}`;
  return `/organization/${organizationId}/${segment}`;
}

function OrganizationSwitcher({ current, organizations, dark = false }: { current: OrganizationContext["organization"]; organizations: AccessibleOrganization[]; dark?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch organization"
          className={cn("flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border px-3 text-left shadow-[0_10px_30px_rgba(17,18,20,0.06)] outline-none transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:opacity-60 sm:min-w-56", dark ? "border-white/10 bg-[#0b213d] text-white hover:border-white/20" : "border-black/[0.07] bg-white text-[#17191c] hover:border-black/15 hover:shadow-[0_14px_36px_rgba(17,18,20,0.09)]")}
          disabled={isPending}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#ffbb00] text-[#17191c]">
            <IconBuildingStadium className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{current.name}</span>
            <span className={cn("block truncate text-[11px] font-medium", dark ? "text-[#9eb0c6]" : "text-[#777a7f]")}>{formatCode(current.organizationType)} workspace</span>
          </span>
          <IconChevronDown className="size-4 shrink-0 text-[#777a7f]" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border-black/10 bg-white p-2 text-[#17191c] shadow-xl">
        <DropdownMenuLabel className="text-xs font-semibold text-[#777a7f]">Organization workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-black/[0.07]" />
        {organizations.map((entry) => {
          const selected = entry.organization.id === current.id;
          const role = entry.access.scope === "platform" ? "Platform access" : formatCode(entry.access.role);
          return (
            <DropdownMenuItem
              key={entry.organization.id}
              disabled={selected}
              className="min-h-12 cursor-pointer rounded-xl focus:bg-[#f1f0eb] focus:text-[#17191c] data-[disabled]:opacity-100"
              onSelect={() => {
                if (selected) return;
                startTransition(() => router.push(`/organization/${entry.organization.id}/dashboard`));
              }}
            >
              <span className={cn("size-2 rounded-full", selected ? "bg-[#ffbb00]" : "bg-[#c8c6bf]")} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{entry.organization.name}</span>
                <span className="block truncate text-xs text-[#777a7f]">{role}</span>
              </span>
              {selected ? <span className="text-xs font-bold text-[#7d5b00]">Current</span> : null}
            </DropdownMenuItem>
          );
        })}
        {organizations.length === 0 ? <div className="px-2 py-3 text-sm text-[#777a7f]">No available organizations</div> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Navigation({ organizationId, pathname, expanded = false, mobile = false, dark = false }: { organizationId: string; pathname: string; expanded?: boolean; mobile?: boolean; dark?: boolean }) {
  const preview = isPreviewPath(pathname);
  const items = expanded
    ? (preview ? PRIMARY_NAVIGATION : NAVIGATION)
    : NAVIGATION.filter((item) => preview ? RAIL_SEGMENTS.has(item.segment) : item.productionAvailable === true);
  return (
    <nav aria-label="Organization workspace" className={cn("grid gap-1.5", expanded && "gap-2")}>
      {items.map((item) => {
        const href = navigationHref(organizationId, item.segment, preview);
        const active = item.segment === "dashboard"
          ? pathname === href || (!preview && pathname.startsWith(`${href}/`))
          : pathname === href || pathname.startsWith(`${href}/`);
        const available = preview || item.productionAvailable === true;
        const Icon = item.icon;
        const label = available ? item.label : `${item.label} — coming soon`;
        const content = (
          <>
            <Icon className="size-5 shrink-0" aria-hidden />
            {expanded ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
            {!available ? (
              <>
                <IconLock className={cn("size-3 shrink-0", !expanded && "absolute bottom-1 right-1")} aria-hidden />
                <span className="sr-only">Not available yet</span>
              </>
            ) : null}
          </>
        );
        const className = cn(
          "relative flex min-h-11 items-center rounded-2xl text-sm font-semibold outline-none transition-[background-color,color,transform,box-shadow] focus-visible:ring-2 focus-visible:ring-[#ffbb00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f0efe9]",
          expanded ? "w-full gap-3 px-3" : "size-11 justify-center",
          active ? (dark ? "bg-[#142e4e] text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)]" : "bg-[#17191c] text-white shadow-[0_8px_20px_rgba(17,18,20,0.18)]") : (dark ? "text-[#9eb0c6] hover:-translate-y-0.5 hover:bg-white/10 hover:text-white" : "text-[#65686d] hover:-translate-y-0.5 hover:bg-white hover:text-[#17191c] hover:shadow-[0_8px_24px_rgba(17,18,20,0.07)]"),
          !available && "cursor-not-allowed text-[#aaa8a1] hover:translate-y-0 hover:bg-transparent hover:text-[#aaa8a1] hover:shadow-none",
        );
        if (!available) {
          return <div key={item.segment} aria-disabled="true" aria-label={label} title={label} className={className}>{content}</div>;
        }
        const link = (
          <Link key={item.segment} href={href} aria-label={expanded ? undefined : label} title={expanded ? undefined : label} aria-current={active ? "page" : undefined} className={className}>
            {content}
          </Link>
        );
        return mobile ? <SheetClose key={item.segment} asChild>{link}</SheetClose> : link;
      })}
    </nav>
  );
}

function TopNavigation({ organizationId, pathname, dark = false }: { organizationId: string; pathname: string; dark?: boolean }) {
  const preview = isPreviewPath(pathname);

  return (
    <nav
      aria-label="Primary organization sections"
      className="flex min-w-0 flex-1 items-center justify-start gap-2 overflow-x-auto px-2 sm:justify-center lg:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {PRIMARY_NAVIGATION.map((item) => {
        const href = navigationHref(organizationId, item.segment, preview);
        const active = item.segment === "dashboard"
          ? pathname === href || (!preview && pathname.startsWith(`${href}/`))
          : pathname === href || pathname.startsWith(`${href}/`);
        const available = preview || item.productionAvailable === true;

        if (!available) {
          return (
            <span
              key={item.segment}
              aria-disabled="true"
              aria-label={`${item.label} — coming soon`}
              title={`${item.label} — coming soon`}
              className="hidden min-h-10 shrink-0 cursor-not-allowed items-center rounded-2xl px-3 text-[13px] font-semibold text-[#aaa8a1] sm:inline-flex"
            >
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.segment}
            href={href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-10 shrink-0 items-center rounded-2xl px-3 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#ffbb00]",
              !active && "hidden sm:inline-flex",
              active
                ? (dark ? "bg-[#1a3556] text-white" : "bg-[#f1f0ec] text-[#0d213f]")
                : (dark ? "text-[#d3deeb] hover:bg-white/10 hover:text-white" : "text-[#3d4655] hover:bg-[#f7f6f2] hover:text-[#0d213f]"),
            )}
          >
            {item.label}
            {active ? <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#ffbb00]" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspaceFilters({ options, dark = false }: { options: OrganizationWorkspaceOptions; dark?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("team") ?? "";
  const seasonId = searchParams.get("season") ?? "";

  function setFilter(name: "team" | "season", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const selectClassName = cn(
    "min-h-11 w-full appearance-none rounded-xl border py-2 pl-3 pr-8 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#ffbb00] disabled:cursor-not-allowed disabled:text-[#aaa8a1]",
    dark ? "border-white/10 bg-[#0b213d] text-white hover:bg-[#102b49]" : "border-black/[0.07] bg-[#f6f5f1] text-[#27292d] hover:bg-[#efeee8]",
  );
  return (
    <div className="flex w-full gap-2 xl:w-auto" aria-label="Workspace filters">
      <label className="relative min-w-0 flex-1 xl:w-44 xl:flex-none">
        <span className="sr-only">Filter by team</span>
        <IconFilter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#777a7f]" aria-hidden />
        <select value={teamId} disabled={options.teams.length === 0} onChange={(event) => setFilter("team", event.target.value)} className={cn(selectClassName, "pl-9")}>
          <option value="">All teams</option>
          {options.teams.map((team) => <option key={team.id} value={team.id}>{team.name}{team.sport ? ` (${formatCode(team.sport)})` : ""}</option>)}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#777a7f]" aria-hidden />
      </label>
      <label className="relative min-w-0 flex-1 xl:w-44 xl:flex-none">
        <span className="sr-only">Filter by season</span>
        <select value={seasonId} disabled={options.seasons.length === 0} onChange={(event) => setFilter("season", event.target.value)} className={selectClassName}>
          <option value="">All seasons</option>
          {options.seasons.map((season) => <option key={season.id} value={season.id}>{season.seasonCode} ({formatCode(season.sport)})</option>)}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#777a7f]" aria-hidden />
      </label>
    </div>
  );
}

export function WorkspaceContextActions({ action }: { action?: ReactNode }) {
  const chrome = useContext(WorkspaceChromeContext);
  if (!chrome) return action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null;
  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
      <OrganizationSwitcher current={chrome.context.organization} organizations={chrome.organizations} dark={chrome.dark} />
      <WorkspaceFilters options={chrome.options} dark={chrome.dark} />
      {action}
    </div>
  );
}

function AccountMenu({ context, compact = false, dark = false }: { context: OrganizationContext; compact?: boolean; dark?: boolean }) {
  const router = useRouter();
  const { mode, setMode } = useOrganizationTheme();
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={compact ? `Open account menu — ${accessLabel(context)}` : undefined}
          title={compact ? "Account" : undefined}
          className={cn("flex min-h-11 items-center rounded-2xl text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#ffbb00]", dark ? "text-[#c2cfde] hover:bg-white/10 hover:text-white" : "text-[#56595e] hover:bg-white hover:text-[#17191c]", compact ? "size-11 justify-center" : "w-full gap-3 px-3")}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#ffbb00] text-[#17191c]"><IconUserCircle className="size-5" aria-hidden /></span>
          {!compact ? (
            <>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">Account</span><span className="block truncate text-xs text-[#777a7f]">{accessLabel(context)}</span></span>
              <IconChevronDown className="size-4" aria-hidden />
            </>
          ) : <span className="sr-only">{accessLabel(context)}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "start" : "end"} side={compact ? "right" : "bottom"} className="w-56 rounded-2xl border-black/10 bg-white p-2 text-[#17191c] shadow-xl">
        <DropdownMenuLabel><span className="block text-sm">Workspace access</span><span className="block text-xs font-normal text-[#777a7f]">{accessLabel(context)}</span></DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-black/[0.07]" />
        <DropdownMenuItem asChild className="rounded-xl focus:bg-[#f1f0eb] focus:text-[#17191c]"><Link href="/dashboard"><IconUserCircle aria-hidden />Personal dashboard</Link></DropdownMenuItem>
        <DropdownMenuSeparator className="bg-black/[0.07]" />
        <DropdownMenuLabel className="text-xs text-[#777d87]">Workspace appearance</DropdownMenuLabel>
        {[['reference', 'Reference'], ['light', 'Light'], ['dark', 'Dark'], ['team', 'Team colors']].map(([value, label]) => (
          <DropdownMenuItem key={value} onSelect={() => setMode(value as "reference" | "light" | "dark" | "team")} className="rounded-xl focus:bg-[#f1f0eb] focus:text-[#17191c]">
            <IconPalette aria-hidden />{label}{mode === value ? <span className="ml-auto text-xs font-bold text-[#8b6500]">Active</span> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-black/[0.07]" />
        <DropdownMenuItem disabled={signingOut} onSelect={(event) => { event.preventDefault(); void signOut(); }} className="rounded-xl focus:bg-[#f1f0eb] focus:text-[#17191c]"><IconLogout aria-hidden />{signingOut ? "Signing out" : "Sign out"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNavigation({ context, organizations, pathname, dark = false }: { context: OrganizationContext; organizations: AccessibleOrganization[]; pathname: string; dark?: boolean }) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", dark ? "bg-[#06182f] text-white" : "bg-[#f0efe9] text-[#17191c]")}>
      <div className="border-b border-black/[0.07] p-5">
        <Link href="/" className="mb-5 flex w-fit items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#17191c] font-black text-[#ffbb00]">B</span>
          <span><span className="block font-[var(--font-oswald)] text-base font-bold tracking-wide">BLTZ</span><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#777a7f]">Media operations</span></span>
        </Link>
        <OrganizationSwitcher current={context.organization} organizations={organizations} dark={dark} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4"><Navigation organizationId={context.organization.id} pathname={pathname} expanded mobile dark={dark} /></div>
      <div className={cn("border-t p-4", dark ? "border-white/10" : "border-black/[0.07]")}><AccountMenu context={context} dark={dark} /></div>
    </div>
  );
}

function UtilityMenu({
  icon: Icon,
  label,
  children,
  dark = false,
}: {
  icon: NavigationIcon;
  label: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#ffbb00]", dark ? "text-white hover:bg-white/10" : "text-[#0d213f] hover:bg-[#f3f2ee]")}
        >
          <Icon className="size-5" aria-hidden />
          {label === "Open notifications" ? <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-[#ffbb00]" aria-hidden /> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-2xl border-black/10 bg-white p-2 text-[#0d213f] shadow-xl">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type OrganizationShellProps = { context: OrganizationContext; organizations: AccessibleOrganization[]; options: OrganizationWorkspaceOptions; children: ReactNode };

export function OrganizationShell(props: OrganizationShellProps) {
  const pathname = usePathname();
  const referenceDark = ["/players", "/agreements", "/attribution", "/messages"].some((segment) => pathname.includes(`/organization/preview${segment}`));
  return <OrganizationThemeProvider initialTone={referenceDark ? "dark" : "light"}><OrganizationShellBody {...props} /></OrganizationThemeProvider>;
}

function OrganizationShellBody({ context, organizations, options, children }: OrganizationShellProps) {
  const pathname = usePathname();
  const { tone } = useOrganizationTheme();
  const dark = tone === "dark" || tone === "team";
  const preview = isPreviewPath(pathname);
  const previewHref = (segment: string) => preview
    ? (segment === "dashboard" ? "/organization/preview" : `/organization/preview/${segment}`)
    : `/organization/${context.organization.id}/${segment}`;

  return (
    <WorkspaceChromeContext.Provider value={{ context, organizations, options, dark }}>
    <div data-organization-tone={tone} className={cn("min-h-[100dvh] transition-colors duration-300", dark ? "bg-[#06182f] text-white" : "bg-[#f7f6f2] text-[#17191c]")} style={{ "--org-accent": "#ffbb00" } as CSSProperties}>
      <div className="min-h-[100dvh]">
        <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4 lg:px-7">
          <div className={cn("mx-auto flex max-w-[1600px] items-center gap-2 rounded-[24px] border px-3 py-2 shadow-[0_14px_44px_rgba(13,33,63,0.09)] backdrop-blur-xl transition-colors sm:px-4", dark ? "border-white/10 bg-[#071a35]/95" : "border-black/[0.08] bg-white/95")}>
            <Sheet>
              <SheetTrigger asChild><button type="button" aria-label="Open workspace navigation" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-black/[0.07] text-[#17191c] outline-none transition-colors hover:bg-[#f1f0eb] focus-visible:ring-2 focus-visible:ring-[#ffbb00] md:hidden"><IconMenu2 className="size-5" aria-hidden /></button></SheetTrigger>
              <SheetContent side="left" className="w-[min(21rem,92vw)] gap-0 border-black/10 bg-[#f0efe9] p-0 text-[#17191c]">
                <SheetHeader className="sr-only"><SheetTitle>Organization navigation</SheetTitle><SheetDescription>Switch organizations and open CRM sections.</SheetDescription></SheetHeader>
                <MobileNavigation context={context} organizations={organizations} pathname={pathname} dark={dark} />
              </SheetContent>
            </Sheet>
            <Link
              href={previewHref("dashboard")}
              className="mr-1 hidden shrink-0 rounded-xl px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] sm:block"
              aria-label="BLTZ organization overview"
            >
              <span className={cn("block -skew-x-6 font-[var(--font-oswald)] text-2xl font-black italic leading-none tracking-[-0.04em]", dark ? "text-white" : "text-[#0d213f]")}>BLTZ</span>
              <span className={cn("mt-0.5 block text-[7px] font-black uppercase tracking-[0.14em]", dark ? "text-white" : "text-[#0d213f]")}>Organization CRM</span>
            </Link>

            <TopNavigation organizationId={context.organization.id} pathname={pathname} dark={dark} />

            <div className="ml-auto flex shrink-0 items-center gap-0.5 border-l border-black/[0.07] pl-2">
              <UtilityMenu icon={IconSearch} label="Open workspace search" dark={dark}>
                <DropdownMenuLabel className="text-xs text-[#777d87]">Search a focused workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[["Players", "players"], ["Media library", "media"], ["Reports", "reports"]].map(([label, segment]) => (
                  <DropdownMenuItem key={segment} asChild className="rounded-xl focus:bg-[#f2f1ed] focus:text-[#0d213f]">
                    <Link href={previewHref(segment)}><IconSearch aria-hidden />{label}</Link>
                  </DropdownMenuItem>
                ))}
              </UtilityMenu>
              <UtilityMenu icon={IconBell} label="Open notifications" dark={dark}>
                <DropdownMenuLabel className="text-xs text-[#777d87]">Workspace notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="space-y-1 p-1">
                  <p className="rounded-xl bg-[#fff7dc] px-3 py-2 text-xs leading-5">Three media items are ready for review.</p>
                  <p className="rounded-xl px-3 py-2 text-xs leading-5 text-[#69717d]">Preview activity only—no live alert was created.</p>
                </div>
              </UtilityMenu>
              <UtilityMenu icon={IconHelpCircle} label="Open workspace help" dark={dark}>
                <DropdownMenuLabel className="text-xs text-[#777d87]">Workspace help</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-3 text-xs leading-5 text-[#69717d]">Use the named top navigation to move between every CRM workspace. Preview actions never persist data.</div>
              </UtilityMenu>
              <AccountMenu context={context} compact dark={dark} />
            </div>
          </div>

          {!preview || pathname === "/organization/preview" ? <div className="mx-auto mt-3 flex max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"><OrganizationSwitcher current={context.organization} organizations={organizations} dark={dark} /><WorkspaceFilters options={options} dark={dark} /></div> : null}
        </header>
        <main id="organization-workspace" className="organization-workspace min-h-[calc(100dvh-5rem)] px-3 pb-8 pt-2 sm:px-5 lg:px-7"><div className="mx-auto max-w-[1600px]">{children}</div></main>
      </div>
    </div>
    </WorkspaceChromeContext.Provider>
  );
}
