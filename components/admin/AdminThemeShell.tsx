"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Laptop, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const routeDetails: Record<string, { title: string; description: string; imageSeed: string }> = {
  "/admin": {
    title: "Operations command center",
    description: "A clear view of platform activity, account health, and the work that needs attention.",
    imageSeed: "stadium-operations-grey",
  },
  "/admin/users": {
    title: "People and access",
    description: "Review accounts, roles, participation, and moderation history across the BLTZ platform.",
    imageSeed: "athlete-portrait-grey",
  },
  "/admin/messages": {
    title: "Message center",
    description: "Manage operational conversations with athletes, organizations, and internal teams.",
    imageSeed: "sports-press-room-grey",
  },
  "/admin/moderation": {
    title: "Trust and moderation",
    description: "Resolve reports and content exceptions with a focused, auditable review workflow.",
    imageSeed: "stadium-tunnel-grey",
  },
  "/admin/analytics": {
    title: "Platform analytics",
    description: "Track acquisition, engagement, content performance, and revenue signals in one operating view.",
    imageSeed: "scoreboard-data-grey",
  },
  "/admin/settings": {
    title: "Platform settings",
    description: "Configure access, notifications, integrations, security, and system behavior.",
    imageSeed: "stadium-control-room-grey",
  },
};

const signals = ["Platform operations", "Identity", "Rights", "Trust", "Revenue", "System health"];

function AppearanceControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-10 w-52 rounded-full bg-neutral-200/70 dark:bg-neutral-800" aria-hidden="true" />;

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "Auto", icon: Laptop },
  ];

  return (
    <div className="flex rounded-full border border-neutral-200 bg-white/80 p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/80" aria-label="Appearance">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]",
            theme === value
              ? "bg-neutral-950 text-white shadow-sm dark:bg-white dark:text-neutral-950"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function AdminThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shellRef = useRef<HTMLDivElement>(null);
  const workspace = pathname === "/admin/beta"
    ? "beta"
    : pathname === "/admin/gtm" || pathname.startsWith("/admin/gtm/")
      ? "gtm"
      : pathname === "/admin/preview-lockers" || pathname.startsWith("/admin/preview-lockers/") ? "preview" : null;
  const route = routeDetails[pathname] ?? routeDetails["/admin"];

  useGSAP(() => {
    if (workspace) return;
    const motion = gsap.matchMedia();
    motion.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-admin-hero-copy]", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: "power3.out" });
      gsap.fromTo("[data-admin-hero-image]", { scale: 0.82, opacity: 0.25 }, {
        scale: 1,
        opacity: 0.82,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: "[data-admin-header]", start: "top 85%", end: "bottom 25%", scrub: true },
      });
      gsap.to("[data-admin-signal-track]", { xPercent: -50, duration: 30, repeat: -1, ease: "none" });
      gsap.utils.toArray<HTMLElement>("[data-admin-content] > *").forEach((section, index) => {
        gsap.fromTo(section, { y: 32 + index * 4, opacity: 0.2 }, {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top 94%", end: "top 70%", scrub: true },
        });
      });
    });
    return () => motion.revert();
  }, { scope: shellRef, dependencies: [pathname, workspace] });

  if (workspace === "beta") {
    return <div className="admin-theme-shell min-h-full" data-admin-workspace="beta">{children}</div>;
  }
  if (workspace === "preview") return <div className="admin-theme-shell min-h-full bg-background text-foreground" data-admin-workspace="preview">{children}</div>;

  if (workspace === "gtm") {
    return (
      <div
        className="admin-theme-shell admin-theme-gtm min-h-full bg-[#f1f0ed] text-neutral-950 transition-colors duration-300 dark:bg-[#0b0c0e] dark:text-neutral-50"
        data-admin-workspace="gtm"
      >
        {children}
      </div>
    );
  }

  return (
    <div ref={shellRef} className="admin-theme-shell admin-theme-legacy relative min-h-full overflow-x-hidden bg-[#f1f0ed] text-neutral-950 transition-colors duration-300 dark:bg-[#0b0c0e] dark:text-neutral-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_76%_10%,rgba(255,187,0,0.12),transparent_31%),radial-gradient(circle_at_18%_10%,rgba(115,115,115,0.12),transparent_26%)] dark:bg-[radial-gradient(circle_at_76%_10%,rgba(255,187,0,0.08),transparent_30%),radial-gradient(circle_at_18%_10%,rgba(82,82,82,0.16),transparent_26%)]" />
      <header data-admin-header className="relative mx-auto max-w-[1600px] px-4 pb-8 pt-10 sm:px-8 sm:pb-12 sm:pt-16">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div data-admin-hero-copy>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">BLTZ internal administration</p>
            <h1 className="max-w-5xl text-balance text-[clamp(2.35rem,5vw,5.25rem)] font-semibold leading-[0.94] tracking-[-0.055em]">{route.title}</h1>
            <p className="mt-5 max-w-2xl text-pretty text-sm leading-6 text-neutral-600 dark:text-neutral-300">{route.description}</p>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <AppearanceControl />
            <div data-admin-hero-image className="relative hidden h-24 w-full max-w-72 overflow-hidden rounded-[1.4rem] border border-white/50 bg-neutral-300 shadow-[0_18px_50px_rgba(38,38,38,0.14)] sm:block dark:border-white/10 dark:bg-neutral-800">
              <div className="absolute inset-0 bg-cover bg-center grayscale contrast-125" style={{ backgroundImage: `url(https://picsum.photos/seed/${route.imageSeed}/640/240)` }} />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/55 via-transparent to-[#ffbb00]/20 mix-blend-multiply" />
            </div>
          </div>
        </div>
      </header>
      <div className="relative overflow-hidden border-y border-neutral-300/80 py-2.5 dark:border-neutral-800">
        <div data-admin-signal-track className="flex w-max items-center whitespace-nowrap">
          {[...signals, ...signals].map((signal, index) => (
            <div key={`${signal}-${index}`} className="flex items-center">
              <span className="mx-6 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{signal}</span>
              <span className="h-1 w-1 rounded-full bg-[#ffbb00]" />
            </div>
          ))}
        </div>
      </div>
      <div data-admin-content className="relative">{children}</div>
    </div>
  );
}
