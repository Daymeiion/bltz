"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, Loader2, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onAvailabilityChange?: (ok: boolean) => void;
}

export function SlugInput({ value, onChange, onAvailabilityChange }: Props) {
  const [status, setStatus] = React.useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");

  React.useEffect(() => {
    const v = value.trim();
    if (!v) {
      setStatus("idle");
      onAvailabilityChange?.(false);
      return;
    }
    if (!/^[a-z0-9](-?[a-z0-9])*$/.test(v) || v.length < 3) {
      setStatus("invalid");
      onAvailabilityChange?.(false);
      return;
    }
    setStatus("checking");
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/onboarding/slug-available?slug=${encodeURIComponent(v)}`, { signal: ctl.signal });
        if (!r.ok) {
          setStatus("invalid");
          onAvailabilityChange?.(false);
          return;
        }
        const body = (await r.json()) as { available: boolean };
        setStatus(body.available ? "ok" : "taken");
        onAvailabilityChange?.(body.available);
      } catch {
        // network blip — don't block submit; treat as ok-pending
        setStatus("idle");
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [value, onAvailabilityChange]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-md border border-white/15 bg-black/40 px-3 py-1 focus-within:border-bltz-gold">
        <span className="text-sm text-white/50">bltz.app/player/</span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          placeholder="jordan-carter"
          className="h-10 border-0 bg-transparent px-0 text-base text-white shadow-none focus-visible:ring-0"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <SlugStatus status={status} />
      </div>
      {status === "invalid" ? (
        <p className="text-xs text-red-400">Use 3+ letters, numbers, or single dashes.</p>
      ) : null}
      {status === "taken" ? (
        <p className="text-xs text-red-400">That URL is taken.</p>
      ) : null}
      {status === "ok" ? (
        <p className="text-xs text-emerald-400">Yours.</p>
      ) : null}
    </div>
  );
}

function SlugStatus({ status }: { status: "idle" | "checking" | "ok" | "taken" | "invalid" }) {
  if (status === "checking") return <Loader2 className="h-4 w-4 animate-spin text-white/60" />;
  if (status === "ok") return <Check className="h-4 w-4 text-emerald-400" />;
  if (status === "taken" || status === "invalid") return <X className={cn("h-4 w-4 text-red-400")} />;
  return null;
}
