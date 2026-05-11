import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BroadcastShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh overflow-hidden bg-[#0B0E1A] text-white">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(41,82,255,0.16),transparent_34%),linear-gradient(135deg,rgba(20,24,43,0.86)_0%,#050711_46%,#000_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="absolute left-0 top-0 h-full w-px bg-white/10" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:96px_96px]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 md:py-10 lg:px-8">
        {/* Brand mark sits above the step indicator on every onboarding
            page. The global navbar is hidden on /onboarding routes
            (see app/client-shell.tsx) so this is the only BLTZ marker
            until the locker is published. Plain <img> to skip
            next/image overhead for an inline SVG. */}
        <div className="mb-8 flex justify-center pt-2 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bltz-white-logo.svg"
            alt="BLTZ"
            className="h-9 w-auto"
          />
        </div>
        {children}
      </main>
    </div>
  );
}

export function BroadcastHeader({
  eyebrow,
  title,
  children,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <header className={cn("space-y-3", align === "center" ? "text-center" : "")}>
      {eyebrow ? (
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-oswald text-4xl font-bold uppercase leading-[0.95] tracking-normal text-white sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {children ? (
        <div
          className={cn(
            "max-w-2xl text-base leading-7 text-white/68",
            // When the header is center-aligned, the children box must
            // also center itself horizontally — not just the text inside.
            align === "center" && "mx-auto",
          )}
        >
          {children}
        </div>
      ) : null}
    </header>
  );
}

export function BroadcastPanel({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "strong";
}) {
  return (
    <section
      className={cn(
        "border border-white/10 bg-[#14182B]/72 backdrop-blur",
        tone === "strong" ? "bg-[#14182B]/92" : "",
        "rounded-lg",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SourceChip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "blue" | "success" | "warn";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center border px-2 font-mono text-[11px] uppercase tracking-[0.14em]",
        tone === "gold" && "border-[#F5A623]/35 bg-[#F5A623]/10 text-[#F5A623]",
        tone === "blue" && "border-[#2952FF]/40 bg-[#2952FF]/12 text-blue-200",
        tone === "success" && "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
        tone === "warn" && "border-[#F5A623]/35 bg-[#F5A623]/10 text-amber-200",
        tone === "neutral" && "border-white/12 bg-white/[0.04] text-white/58",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TrustRail({
  items,
  className,
}: {
  items: Array<{ label: string; value: string; tone?: "neutral" | "gold" | "blue" | "success" | "warn" }>;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div key={item.label} className="border border-white/10 bg-black/24 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/42">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-1 font-oswald text-2xl font-bold uppercase leading-none text-white",
              item.tone === "gold" && "text-[#F5A623]",
              item.tone === "blue" && "text-blue-200",
              item.tone === "success" && "text-emerald-200",
              item.tone === "warn" && "text-amber-200",
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
