"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  firstName: string;
  slug: string;
  headshotUrl: string | null;
}

/**
 * First-session welcome card shown right after publishing a locker.
 *
 * Each checklist item links to a route that exists today. We deliberately
 * don't list deferred features (theme builder, pipeline queue) — every row
 * here resolves to a real page so the user never bumps into a 404.
 */
export function FirstSessionOverview({ firstName, slug, headshotUrl }: Props) {
  const [dismissed, setDismissed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  if (dismissed) return null;

  const lockerUrl = `/player/${slug}`;
  const fullUrl =
    typeof window !== "undefined" ? `${window.location.origin}${lockerUrl}` : lockerUrl;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — fallback is the visible URL
    }
  }

  const checklist: { id: string; label: string; done: boolean; href?: string; onClick?: () => void; cta: string }[] = [
    {
      id: "locker",
      label: "Visit your published locker",
      done: false,
      href: lockerUrl,
      cta: "Open",
    },
    {
      id: "share",
      label: "Copy your locker link",
      done: copied,
      onClick: copyLink,
      cta: copied ? "Copied!" : "Copy",
    },
    {
      id: "headshot",
      label: "Add or replace your headshot",
      done: Boolean(headshotUrl),
      href: "/dashboard/settings",
      cta: headshotUrl ? "Update" : "Add",
    },
    {
      id: "video",
      label: "Upload your first highlight",
      done: false,
      href: "/dashboard/videos",
      cta: "Upload",
    },
  ];

  return (
    <div className="px-6 pt-6 md:px-10 md:pt-10">
      <div className="relative overflow-hidden rounded-2xl border border-bltz-gold/30 bg-gradient-to-br from-bltz-gold/15 via-black/60 to-black p-6 md:p-8">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss welcome card"
          className="absolute right-4 top-4 text-white/60 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-bltz-gold">
            Locker live
          </p>
          <h2 className="font-oswald text-3xl font-bold uppercase text-white md:text-4xl">
            You&apos;re on the board, {firstName}.
          </h2>
          <p className="text-sm text-white/70 md:text-base">
            Here&apos;s a short list of next moves before you call it.
          </p>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {checklist.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    item.done
                      ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                      : "border-white/20 text-white/40",
                  )}
                >
                  {item.done ? <Check className="h-4 w-4" /> : null}
                </span>
                <span className="text-sm text-white/85">{item.label}</span>
              </div>
              {item.href ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-1 text-xs font-semibold text-white/85 hover:border-bltz-gold hover:text-bltz-gold"
                >
                  {item.cta}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-1 text-xs font-semibold text-white/85 hover:border-bltz-gold hover:text-bltz-gold"
                >
                  {item.cta}
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
