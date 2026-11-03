"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useContext, createContext, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  IconBuildingStadium,
  IconLayoutDashboard,
  IconCheck,
  IconChevronDown,
  IconLock,
  IconLogout,
  IconPalette,
  IconRocket,
  IconSparkles,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AccessibleOrganization, OrganizationContext, OrganizationWorkspaceOptions } from "@/lib/organization/types";
import type { ShellCapabilityKey } from "@/lib/enterprise-crm/auth/shell-capabilities";
import type { WorkspaceAccess } from "@/lib/enterprise-crm/workspace-access";
import { OrganizationThemeProvider, useOrganizationTheme } from "./OrganizationTheme";
import { CanvasToggle, SchoolArt } from "./pilot/PilotMotion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type NavigationItem = {
  label: string;
  segment: "dashboard" | "intelligence" | "launch";
  icon: ComponentType<{ className?: string; stroke?: number; "aria-hidden"?: boolean }>;
  capability: ShellCapabilityKey;
  /** Also requires permission to plan activations. */
  manage?: boolean;
};

/** Pilot scope: the overview of moments and reach, and each former player's intelligence. */
const NAVIGATION: readonly NavigationItem[] = [
  { label: "Overview", segment: "dashboard", icon: IconLayoutDashboard, capability: "navigation.home" },
  { label: "Intelligence", segment: "intelligence", icon: IconSparkles, capability: "navigation.intelligence" },
  { label: "Launch a Locker", segment: "launch", icon: IconRocket, capability: "navigation.intelligence", manage: true },
];

const ShellContext = createContext<{ access?: WorkspaceAccess; theme?: WorkspaceAccess["theme"] } | null>(null);

function isPreviewPath(pathname: string): boolean {
  return pathname === "/organization/preview" || pathname.startsWith("/organization/preview/");
}

export function navigationHref(organizationId: string, segment: NavigationItem["segment"], preview: boolean): string {
  if (preview) return segment === "dashboard" ? "/organization/preview" : `/organization/preview/${segment}`;
  return `/organization/${organizationId}/${segment}`;
}

function formatCode(value: string): string {
  return value.split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function accessLabel(context: OrganizationContext): string {
  return context.access.scope === "platform" ? "BLTZ admin" : formatCode(context.access.role);
}

function SchoolMark() {
  const logoUrl = useContext(ShellContext)?.theme?.logoUrl ?? null;
  const { mode } = useOrganizationTheme();
  return (
    <span className="pilot-mark" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- directory logos come from arbitrary HTTPS hosts */}
      {logoUrl && mode === "school" ? <img src={logoUrl} alt="" /> : <IconBuildingStadium stroke={1.5} />}
    </span>
  );
}

function SchoolSwitcher({ current, organizations, onNavigate }: { current: OrganizationContext["organization"]; organizations: AccessibleOrganization[]; onNavigate?: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const identity = <><SchoolMark /><span className="pilot-school__copy"><strong>{current.name}</strong><small>School workspace</small></span></>;

  if (organizations.length < 2) return <div className="pilot-school">{identity}</div>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Switch school" className="pilot-school pilot-school--button" disabled={isPending}>
          {identity}<IconChevronDown stroke={1.5} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="pilot-menu">
        <DropdownMenuLabel>Schools</DropdownMenuLabel>
        {organizations.map((entry) => {
          const selected = entry.organization.id === current.id;
          return (
            <DropdownMenuItem key={entry.organization.id} disabled={selected} onSelect={() => {
              if (selected) return;
              onNavigate?.();
              startTransition(() => router.push(`/organization/${entry.organization.id}/dashboard`));
            }}>
              {entry.organization.name}{selected ? <IconCheck stroke={1.5} className="ml-auto" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Navigation({ organizationId, pathname, onNavigate }: { organizationId: string; pathname: string; onNavigate?: () => void }) {
  const preview = isPreviewPath(pathname);
  const access = useContext(ShellContext)?.access;
  // Live workspaces show only what the member has been granted.
  const items = access && !preview ? NAVIGATION.filter((item) => access.capabilities[item.capability] && (!item.manage || access.canManageActivations)) : NAVIGATION;
  return (
    <nav aria-label="School workspace" className="pilot-nav">
      {items.map((item, index) => {
        const href = navigationHref(organizationId, item.segment, preview);
        const current = item.segment === "dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        const Icon = item.icon;
        return (
          <Link key={item.segment} href={href} onClick={onNavigate} className={cn("pilot-nav__item", current && "pilot-nav__item--current")} aria-current={current ? "page" : undefined} style={{ "--pilot-i": index } as CSSProperties}>
            {current ? <motion.span layoutId={onNavigate ? "pilot-nav-pill-mobile" : "pilot-nav-pill"} className="pilot-nav__pill" transition={{ type: "spring", stiffness: 380, damping: 32 }} /> : null}
            <Icon stroke={1.5} aria-hidden /><span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileMenu({ context }: { context: OrganizationContext }) {
  const router = useRouter();
  const { mode, setMode, schoolAvailable } = useOrganizationTheme();
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="pilot-profile">
          <span className="pilot-profile__avatar" aria-hidden>{accessLabel(context).charAt(0)}</span>
          <span className="pilot-profile__copy"><strong>Account</strong><small>{accessLabel(context)}</small></span>
          <IconChevronDown stroke={1.5} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="pilot-menu">
        {schoolAvailable ? (
          <>
            <DropdownMenuLabel>Colors</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setMode("school")}><IconPalette stroke={1.5} aria-hidden />School colors{mode === "school" ? <IconCheck stroke={1.5} className="ml-auto" aria-hidden /> : null}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setMode("bltz")}><IconPalette stroke={1.5} aria-hidden />BLTZ colors{mode === "bltz" ? <IconCheck stroke={1.5} className="ml-auto" aria-hidden /> : null}</DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem disabled={signingOut} onSelect={(event) => { event.preventDefault(); void signOut(); }}><IconLogout stroke={1.5} aria-hidden />{signingOut ? "Signing out" : "Sign out"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RailContents({ context, organizations, pathname, onNavigate }: { context: OrganizationContext; organizations: AccessibleOrganization[]; pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <Link href={navigationHref(context.organization.id, "dashboard", isPreviewPath(pathname))} onClick={onNavigate} className="pilot-brand" aria-label="BLTZ home">
        <span aria-hidden>B</span><strong>BLTZ</strong>
      </Link>
      <SchoolSwitcher current={context.organization} organizations={organizations} onNavigate={onNavigate} />
      <Navigation organizationId={context.organization.id} pathname={pathname} onNavigate={onNavigate} />
      <div className="pilot-rail__footer"><ProfileMenu context={context} /></div>
    </>
  );
}

type OrganizationShellProps = {
  context: OrganizationContext;
  organizations: AccessibleOrganization[];
  options: OrganizationWorkspaceOptions;
  access?: WorkspaceAccess;
  /** Fictional previews pass a sample school identity instead of server access. */
  previewTheme?: WorkspaceAccess["theme"];
  children: ReactNode;
};

export function OrganizationShell(props: OrganizationShellProps) {
  const theme = props.access?.theme ?? props.previewTheme;
  return (
    <OrganizationThemeProvider
      schoolAccent={theme?.mode === "school" ? theme.accent : undefined}
      schoolHighlight={theme?.mode === "school" ? theme.highlight : undefined}
      schoolAvailable={theme ? theme.mode === "school" : true}
      defaultMode={theme?.mode ?? "bltz"}
      defaultCanvas="school"
    >
      <OrganizationShellBody {...props} />
    </OrganizationThemeProvider>
  );
}

function OrganizationShellBody({ context, organizations, access, previewTheme, children }: OrganizationShellProps) {
  const pathname = usePathname();
  const { mode, canvas, accent, highlight } = useOrganizationTheme();
  const theme = access?.theme ?? previewTheme;
  const [menuOpen, setMenuOpen] = useState(false);
  const style = { "--crm-org-accent": accent, "--crm-org-highlight": highlight } as CSSProperties;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

  return (
    <ShellContext.Provider value={{ access, theme }}>
      <div data-product="enterprise-crm" data-organization-theme={mode} data-canvas={canvas} className="pilot-shell" style={style}>
        <aside className="pilot-rail" aria-label="Workspace">
          <div className="pilot-rail__core"><RailContents context={context} organizations={organizations} pathname={pathname} /></div>
        </aside>

        <div className="pilot-mobile-bar">
          <span className="pilot-brand" aria-hidden><span>B</span><strong>BLTZ</strong></span>
          <button type="button" className={cn("pilot-burger", menuOpen && "pilot-burger--open")} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="pilot-mobile-menu" onClick={() => setMenuOpen((open) => !open)}>
            <span /><span />
          </button>
        </div>
        <div id="pilot-mobile-menu" className={cn("pilot-mobile-menu", menuOpen && "pilot-mobile-menu--open")} hidden={!menuOpen}>
          <RailContents context={context} organizations={organizations} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
        </div>

        <main id="organization-workspace" className="pilot-main">
          <SchoolArt logoUrl={mode === "school" ? theme?.logoUrl ?? null : null} />
          <div className="pilot-main__bar"><CanvasToggle /></div>
          {children}
        </main>
      </div>
    </ShellContext.Provider>
  );
}

/** Shown in place of a section the member has not been granted. */
export function PilotRestricted() {
  return (
    <div className="pilot-page">
      <div className="pilot-empty pilot-empty--page">
        <IconLock stroke={1.25} aria-hidden />
        <strong>Your access is being set up.</strong>
        <span>Your BLTZ contact will turn on this workspace for you. Nothing is needed on your side.</span>
      </div>
    </div>
  );
}
