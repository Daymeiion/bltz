"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { IconArrowRight, IconInfoCircle, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useOrganizationTheme } from "../OrganizationTheme";
import { WorkspaceContextActions } from "../OrganizationShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const previewButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-[#ffbb00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f4ef] disabled:pointer-events-none disabled:opacity-50";

export function PreviewBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "green" | "red" | "blue";
}) {
  const tones = {
    neutral: "border-[#d8d7d0] bg-[#efeee9] text-[#5d6470]",
    gold: "border-[#f3cc67] bg-[#fff6d9] text-[#775300]",
    green: "border-[#a8ddba] bg-[#edf9f1] text-[#176535]",
    red: "border-[#efb5b0] bg-[#fff0ee] text-[#9b2c24]",
    blue: "border-[#b8cff5] bg-[#eef4ff] text-[#1e5fae]",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function PreviewNotice({ children }: { children: ReactNode }) {
  const { tone } = useOrganizationTheme();
  const dark = tone === "dark" || tone === "team";
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-5", dark ? "border-white/10 bg-white/[0.04] text-[#b5c2d3]" : "border-[#d9d8d1] bg-[#f7f6f2] text-[#626875]")}>
      <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-[#997000]" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { tone } = useOrganizationTheme();
  const dark = tone === "dark" || tone === "team";
  return (
    <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="mb-2 flex items-center gap-3">
          <span className={cn("font-mono text-[10px] font-bold uppercase tracking-[0.2em]", dark ? "text-[#ffbb00]" : "text-[#877027]")}>{eyebrow}</span>
          <span className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", dark ? "text-[#8296af]" : "text-[#98978f]")}>Fictional preview data</span>
        </div>
        <h1 className={cn("font-[var(--font-oswald)] text-[2rem] font-semibold leading-none tracking-[-0.025em] sm:text-[2.55rem]", dark ? "text-white" : "text-[#0d213f]")}>
          {title}
        </h1>
        <p className={cn("mt-2 max-w-2xl text-sm leading-6 sm:text-base", dark ? "text-[#b5c2d3]" : "text-[#69717d]")}>{description}</p>
      </div>
      <WorkspaceContextActions action={action} />
    </header>
  );
}

export function FolderTabs({
  tabs,
  active,
  onChange,
  label,
  variant = "folder",
}: {
  tabs: readonly string[];
  active: string;
  onChange: (tab: string) => void;
  label: string;
  variant?: "folder" | "folder-surface" | "pill";
}) {
  const { tone } = useOrganizationTheme();
  const dark = tone === "dark" || tone === "team";
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onChange(nextTab);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={cn("flex max-w-full overflow-x-auto", variant === "pill" ? "gap-2" : variant === "folder-surface" ? "-mb-3 gap-1 px-4 pb-3" : "-mb-px gap-1 px-1")} role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const selected = active === tab;
        return (
          <button
            key={tab}
            ref={(node) => { tabRefs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            onKeyDown={(event) => moveSelection(event, index)}
            className={cn(
              "relative shrink-0 border px-5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffbb00]",
              variant === "pill" ? "min-h-10 rounded-full" : "min-h-12 rounded-t-[18px] border-b-0",
              variant === "pill"
                ? selected
                  ? "border-[#ffbb00] bg-[#ffbb00] text-[#0d213f]"
                  : (dark ? "border-[#29425f] bg-[#102742] text-[#c4d0df] hover:border-[#ffbb00] hover:text-white" : "border-[#d7d5cc] bg-[#f1f0eb] text-[#596273] hover:border-[#b68a12] hover:text-[#0d213f]")
                : variant === "folder-surface"
                  ? selected
                    ? (dark
                        ? "z-10 border-transparent bg-[#0b213d] text-white shadow-[0_-14px_28px_rgba(0,0,0,0.58)] before:absolute before:-bottom-px before:-left-3 before:h-3 before:w-3 before:bg-[#0b213d] before:[clip-path:polygon(100%_0,100%_100%,0_100%)] after:absolute after:-bottom-px after:-right-3 after:h-3 after:w-3 after:bg-[#0b213d] after:[clip-path:polygon(0_0,100%_100%,0_100%)]"
                        : "z-10 border-transparent bg-white text-[#0d213f] shadow-[0_-12px_24px_rgba(13,33,63,0.28)] before:absolute before:-bottom-px before:-left-3 before:h-3 before:w-3 before:bg-white before:[clip-path:polygon(100%_0,100%_100%,0_100%)] after:absolute after:-bottom-px after:-right-3 after:h-3 after:w-3 after:bg-white after:[clip-path:polygon(0_0,100%_100%,0_100%)]")
                    : (dark ? "border-transparent bg-[#183451] text-[#d2dce8] hover:bg-[#204365] hover:text-white" : "border-transparent bg-[#eeede8] text-[#69717d] hover:bg-[#e4e2dc] hover:text-[#0d213f]")
                : selected
                  ? (dark ? "z-10 border-[#29425f] bg-[#102944] text-white" : "z-10 border-[#d7d5cc] bg-[#fbfaf7] text-[#0d213f]")
                  : (dark ? "border-transparent bg-[#0b213d] text-[#9eb0c6] hover:bg-[#132f4e] hover:text-white" : "border-transparent bg-[#e6e5df] text-[#69717d] hover:bg-[#eeede8] hover:text-[#0d213f]"),
            )}
          >
            {tab}
            {selected && variant !== "pill" ? <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-[#ffbb00]" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function FolderSurface({ children, className }: { children: ReactNode; className?: string }) {
  const { tone } = useOrganizationTheme();
  const dark = tone === "dark" || tone === "team";
  return (
    <section className={cn("rounded-[26px] border p-5 shadow-[0_18px_55px_rgba(13,33,63,0.07)] sm:p-7", dark ? "border-[#29425f] bg-[#071a35]" : "border-[#d7d5cc] bg-[#fbfaf7]", className)}>
      {children}
    </section>
  );
}

export function PreviewModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(open);
  const openTitleRef = useRef(title);

  useEffect(() => {
    if (open) return;
    const captureFocus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) returnFocusRef.current = event.target;
    };
    const captureInvocation = (event: Event) => {
      if (!(event.target instanceof HTMLElement)) return;
      returnFocusRef.current = event.target.closest<HTMLElement>("button, a, input, select, textarea, [tabindex]") ?? event.target;
    };
    const captureKeyboardInvocation = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") captureInvocation(event);
    };
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) returnFocusRef.current = document.activeElement;
    document.addEventListener("focusin", captureFocus);
    document.addEventListener("pointerdown", captureInvocation, true);
    document.addEventListener("keydown", captureKeyboardInvocation, true);
    return () => {
      document.removeEventListener("focusin", captureFocus);
      document.removeEventListener("pointerdown", captureInvocation, true);
      document.removeEventListener("keydown", captureKeyboardInvocation, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) openTitleRef.current = title;
  }, [open, title]);

  useEffect(() => {
    const justClosed = wasOpenRef.current && !open;
    wasOpenRef.current = open;
    if (!justClosed) return;
    const timer = window.setTimeout(() => {
      const captured = returnFocusRef.current?.isConnected ? returnFocusRef.current : null;
      const matchingButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.trim() === openTitleRef.current);
      (captured ?? matchingButton)?.focus();
    }, 260);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={() => {
          if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) returnFocusRef.current = document.activeElement;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
        className="dark max-h-[88dvh] max-w-2xl overflow-y-auto rounded-[26px] border-white/10 bg-[#101827] p-0 text-white shadow-2xl"
      >
        <DialogHeader className="border-b border-white/10 px-6 py-5 text-left sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <PreviewBadge tone="gold">Preview interaction</PreviewBadge>
              <DialogTitle className="mt-3 font-[var(--font-oswald)] text-2xl tracking-tight text-white">{title}</DialogTitle>
              <DialogDescription className="mt-2 max-w-xl leading-6 text-neutral-400">{description}</DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-neutral-300 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#ffbb00]"
              aria-label="Close preview"
            >
              <IconX className="size-5" aria-hidden />
            </button>
          </div>
        </DialogHeader>
        <div className="px-6 py-6 sm:px-7">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function PreviewLink({ href, children }: { href: string; children: ReactNode }) {
  const { tone } = useOrganizationTheme();
  const dark = tone === "dark" || tone === "team";
  return (
    <Link
      href={href}
      className={cn(previewButton, dark ? "border border-white/15 bg-white/[0.05] text-white hover:border-[#ffbb00]" : "border border-[#d5d5ce] bg-white text-[#0d213f] hover:border-[#ffbb00]")}
    >
      {children}
      <IconArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const { tone } = useOrganizationTheme();
  const dark = tone === "dark" || tone === "team";
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className={cn("text-lg font-bold", dark ? "text-white" : "text-[#0d213f]")}>{title}</h2>
        {description ? <p className={cn("mt-1 text-sm leading-5", dark ? "text-[#9eb0c6]" : "text-[#737984]")}>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
