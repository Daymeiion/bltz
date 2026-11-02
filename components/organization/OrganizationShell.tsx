"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import { createContext, useContext, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  IconActivityHeartbeat,
  IconBell,
  IconBolt,
  IconBuilding,
  IconBuildingStadium,
  IconChartBar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconLock,
  IconLogout,
  IconMenu2,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconSparkles,
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

type NavigationItem = {
  label: string;
  segment: string;
  icon: NavigationIcon;
  productionAvailable?: boolean;
  previewAvailable?: boolean;
};

type WorkspaceChromeValue = {
  context: OrganizationContext;
  organizations: AccessibleOrganization[];
  options: OrganizationWorkspaceOptions;
};

const WorkspaceChromeContext = createContext<WorkspaceChromeValue | null>(null);

const NAVIGATION: readonly NavigationItem[] = [
  { label: "Home", segment: "dashboard", icon: IconHome, productionAvailable: true },
  { label: "Athletes", segment: "athletes", icon: IconUsers, previewAvailable: true },
  { label: "Media", segment: "media", icon: IconPhoto, previewAvailable: true },
  { label: "Opportunities", segment: "opportunities", icon: IconBolt },
  { label: "Activations", segment: "activations", icon: IconSpeakerphone },
  { label: "Intelligence", segment: "intelligence", icon: IconSparkles },
  { label: "Analytics", segment: "analytics", icon: IconChartBar, previewAvailable: true },
  { label: "Organization", segment: "organization", icon: IconBuilding },
];

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
  if (preview) return segment === "dashboard" ? "/organization/preview/executive" : `/organization/preview/${segment}`;
  return `/organization/${organizationId}/${segment}`;
}

function OrganizationSwitcher({ current, organizations }: { current: OrganizationContext["organization"]; organizations: AccessibleOrganization[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Switch organization" className="crm-organization-switcher" disabled={isPending}>
          <span className="crm-organization-mark"><IconBuildingStadium aria-hidden /></span>
          <span className="crm-organization-switcher__copy"><strong>{current.name}</strong><span>{formatCode(current.organizationType)} workspace</span></span>
          <IconChevronDown aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="crm-menu-content">
        <DropdownMenuLabel>Organization workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((entry) => {
          const selected = entry.organization.id === current.id;
          return (
            <DropdownMenuItem
              key={entry.organization.id}
              disabled={selected}
              className="crm-menu-item"
              onSelect={() => {
                if (!selected) startTransition(() => router.push(`/organization/${entry.organization.id}/dashboard`));
              }}
            >
              <span className={cn("crm-menu-status", selected && "crm-menu-status--current")} aria-hidden />
              <span className="crm-menu-item__copy"><strong>{entry.organization.name}</strong><span>{entry.access.scope === "platform" ? "Platform access" : formatCode(entry.access.role)}</span></span>
              {selected ? <span className="crm-current-label">Current</span> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ScopeSwitcher({ options }: { options: OrganizationWorkspaceOptions }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const teamId = searchParams.get("team") ?? "";

  function setScope(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set("team", value);
    else next.delete("team");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return (
    <label className="crm-scope-switcher">
      <span>Scope</span>
      <select value={teamId} onChange={(event) => setScope(event.target.value)} disabled={isPending || options.teams.length === 0} aria-busy={isPending || undefined}>
        <option value="">All Athletics</option>
        {options.teams.map((team) => <option key={team.id} value={team.id}>{team.name}{team.sport ? ` · ${formatCode(team.sport)}` : ""}</option>)}
      </select>
      <IconChevronDown aria-hidden />
      {isPending ? <span className="sr-only" role="status">Authorizing selected scope</span> : null}
    </label>
  );
}

function PrimaryNavigation({ organizationId, pathname, expanded, mobile = false }: { organizationId: string; pathname: string; expanded: boolean; mobile?: boolean }) {
  const preview = isPreviewPath(pathname);
  return (
    <nav aria-label="Organization workspace" className="crm-primary-navigation">
      {NAVIGATION.map((item) => {
        const href = navigationHref(organizationId, item.segment, preview);
        const current = item.segment === "dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        const available = preview ? item.productionAvailable || item.previewAvailable : item.productionAvailable;
        const Icon = item.icon;
        const content = <><Icon aria-hidden /><span>{item.label}</span>{!available ? <IconLock className="crm-navigation-lock" aria-hidden /> : null}</>;
        if (!available) {
          return <span key={item.segment} className="crm-navigation-item crm-navigation-item--disabled" aria-disabled="true" aria-label={`${item.label} — unavailable`}>{content}</span>;
        }
        const link = <Link key={item.segment} href={href} className={cn("crm-navigation-item", current && "crm-navigation-item--current")} aria-current={current ? "page" : undefined} aria-label={!expanded ? item.label : undefined} title={!expanded ? item.label : undefined}>{content}</Link>;
        return mobile ? <SheetClose key={item.segment} asChild>{link}</SheetClose> : link;
      })}
    </nav>
  );
}

function SystemHealth({ expanded = true }: { expanded?: boolean }) {
  return (
    <div className="crm-system-health" title="System health: Operational" aria-label="System health: Operational">
      <span aria-hidden><IconActivityHeartbeat /></span>
      {expanded ? <span><strong>Operational</strong><small>System health</small></span> : null}
    </div>
  );
}

function ThemeMenu() {
  const { mode, setMode } = useOrganizationTheme();
  return (
    <>
      <DropdownMenuLabel>Workspace appearance</DropdownMenuLabel>
      <DropdownMenuItem className="crm-menu-item" onSelect={() => setMode("bltz")}><IconBolt aria-hidden />BLTZ Default{mode === "bltz" ? <span className="crm-current-label">Active</span> : null}</DropdownMenuItem>
      <DropdownMenuItem className="crm-menu-item" onSelect={() => setMode("school")}><IconBuildingStadium aria-hidden />School Theme{mode === "school" ? <span className="crm-current-label">Active</span> : null}</DropdownMenuItem>
    </>
  );
}

function AccountMenu({ context, expanded = true }: { context: OrganizationContext; expanded?: boolean }) {
  const router = useRouter();
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
        <button type="button" className="crm-account-trigger" aria-label={!expanded ? `Open profile menu — ${accessLabel(context)}` : undefined}>
          <span><IconUserCircle aria-hidden /></span>
          {expanded ? <span className="crm-account-trigger__copy"><strong>Profile</strong><small>{accessLabel(context)}</small></span> : null}
          {expanded ? <IconChevronDown aria-hidden /> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="crm-menu-content">
        <DropdownMenuLabel><strong>Workspace access</strong><span className="crm-menu-label-note">{accessLabel(context)}</span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeMenu />
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signingOut} className="crm-menu-item" onSelect={(event) => { event.preventDefault(); void signOut(); }}><IconLogout aria-hidden />{signingOut ? "Signing out" : "Sign out"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sidebar({ context, organizations, pathname, collapsed, onCollapse, mobile = false }: { context: OrganizationContext; organizations: AccessibleOrganization[]; pathname: string; collapsed: boolean; onCollapse?: () => void; mobile?: boolean }) {
  const expanded = mobile || !collapsed;
  return (
    <aside className={cn("crm-sidebar", collapsed && !mobile && "crm-sidebar--collapsed")}>
      <div className="crm-sidebar__brand">
        <Link href={navigationHref(context.organization.id, "dashboard", isPreviewPath(pathname))} className="crm-brand" aria-label="BLTZ Enterprise Home"><span aria-hidden>B</span>{expanded ? <span><strong>BLTZ</strong><small>Enterprise CRM</small></span> : null}</Link>
        {!mobile ? <button type="button" className="crm-collapse-button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={onCollapse}>{collapsed ? <IconChevronRight aria-hidden /> : <IconChevronLeft aria-hidden />}</button> : null}
      </div>
      {expanded ? <div className="crm-sidebar__organization"><OrganizationSwitcher current={context.organization} organizations={organizations} /></div> : <div className="crm-sidebar__organization-mark"><span className="crm-organization-mark"><IconBuildingStadium aria-hidden /></span></div>}
      <PrimaryNavigation organizationId={context.organization.id} pathname={pathname} expanded={expanded} mobile={mobile} />
      <div className="crm-sidebar__footer"><SystemHealth expanded={expanded} /><AccountMenu context={context} expanded={expanded} /></div>
    </aside>
  );
}

function SearchMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" className="crm-search-entry"><IconSearch aria-hidden /><span>Search workspace</span><kbd>⌘ K</kbd></button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="crm-menu-content crm-search-menu">
        <DropdownMenuLabel>Global search</DropdownMenuLabel>
        <div className="crm-search-field"><IconSearch aria-hidden /><input aria-label="Search workspace preview" placeholder="Search athletes, media, or work" /></div>
        <p className="crm-menu-note">Search results are unavailable until a server-authorized contract is connected.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreateMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" className="crm-button crm-button--primary"><IconPlus aria-hidden />Create</button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="crm-menu-content">
        <DropdownMenuLabel>BLTZ Create</DropdownMenuLabel>
        <p className="crm-menu-note">Creation actions appear here when their server permission and journey are available.</p>
        {(["Opportunity", "Activation", "Assignment"] as const).map((label) => <DropdownMenuItem key={label} disabled className="crm-menu-item"><IconLock aria-hidden />{label}<span className="crm-current-label">Unavailable</span></DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" className="crm-icon-button" aria-label="Open notifications"><IconBell aria-hidden /><span className="crm-notification-dot" aria-hidden /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="crm-menu-content crm-notification-menu">
        <DropdownMenuLabel>Notifications <span className="crm-preview-label">Preview</span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <p className="crm-notification-item"><strong>Rights review needs an owner</strong><span>Fictional preview only · no live notification</span></p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceContextActions({ action }: { action?: ReactNode }) {
  const chrome = useContext(WorkspaceChromeContext);
  if (!chrome) return action ? <div className="crm-context-actions">{action}</div> : null;
  return <div className="crm-context-actions"><OrganizationSwitcher current={chrome.context.organization} organizations={chrome.organizations} /><ScopeSwitcher options={chrome.options} />{action}</div>;
}

type OrganizationShellProps = { context: OrganizationContext; organizations: AccessibleOrganization[]; options: OrganizationWorkspaceOptions; children: ReactNode };

export function OrganizationShell(props: OrganizationShellProps) {
  const pathname = usePathname();
  const referenceDark = ["/media"].some((segment) => pathname.includes(`/organization/preview${segment}`));
  return <OrganizationThemeProvider initialTone={referenceDark ? "dark" : "light"}><OrganizationShellBody {...props} /></OrganizationThemeProvider>;
}

function OrganizationShellBody({ context, organizations, options, children }: OrganizationShellProps) {
  const pathname = usePathname();
  const { mode, tone, accent, highlight } = useOrganizationTheme();
  const [collapsed, setCollapsed] = useState(false);
  const style = { "--crm-org-accent": accent, "--crm-org-highlight": highlight } as CSSProperties;

  return (
    <WorkspaceChromeContext.Provider value={{ context, organizations, options }}>
      <div data-product="enterprise-crm" data-organization-theme={mode} data-organization-tone={tone} className={cn("crm-app-shell", collapsed && "crm-app-shell--collapsed")} style={style}>
        <div className="crm-desktop-sidebar"><Sidebar context={context} organizations={organizations} pathname={pathname} collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} /></div>
        <div className="crm-shell-main">
          <header className="crm-utility-bar">
            <Sheet>
              <SheetTrigger asChild><button type="button" aria-label="Open workspace navigation" className="crm-icon-button crm-mobile-menu"><IconMenu2 aria-hidden /></button></SheetTrigger>
              <SheetContent side="left" className="crm-mobile-sheet" style={style}>
                <SheetHeader className="sr-only"><SheetTitle>Organization navigation</SheetTitle><SheetDescription>Switch scope and open available Enterprise CRM sections.</SheetDescription></SheetHeader>
                <Sidebar context={context} organizations={organizations} pathname={pathname} collapsed={false} mobile />
              </SheetContent>
            </Sheet>
            <SearchMenu />
            <div className="crm-utility-bar__actions"><ScopeSwitcher options={options} /><CreateMenu /><NotificationsMenu /></div>
          </header>
          <main id="organization-workspace" className="crm-workspace">
            <div className="crm-workspace__inner">{children}</div>
          </main>
        </div>
      </div>
    </WorkspaceChromeContext.Provider>
  );
}
