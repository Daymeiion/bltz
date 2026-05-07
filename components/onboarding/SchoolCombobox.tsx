"use client";

import * as React from "react";
import Image from "next/image";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SchoolOption {
  /** BLTZ schools.id when sourced from the internal `schools` table. */
  id?: string;
  /** ESPN team ID; persisted as `players.cfb_team_id` so the locker can
   *  render team colors and logo. Only set for D1 + smaller-division
   *  programs that ESPN tracks. */
  cfb_team_id?: string;
  /** Display label shown in the combobox row. */
  name: string;
  /** ESPN CDN logo URL. Null for high-school / non-D1 entries. */
  logo_url?: string | null;
  /** Short qualifier (mascot, conference, location). */
  hint?: string | null;
}

export interface SchoolSelection {
  /** ESPN team ID if the user picked a D1+ school from suggestions. */
  cfb_team_id?: string | null;
}

interface Props {
  value: string;
  onChange: (v: string, meta?: SchoolSelection) => void;
  placeholder?: string;
}

/**
 * School combobox with logo-rich autocomplete.
 *
 * Hits `/api/onboarding/schools?q=...` which merges results from
 * `cfb_teams` (logos, ESPN ID) and the internal `schools` table
 * (high-school + non-D1 fallback). Free-text entry is preserved — every
 * athlete must be able to type their program even if it's not in either
 * dataset yet. When a logo'd suggestion is selected, the parent receives
 * both the display name and the ESPN team ID via the meta callback so
 * the locker page can later render team colors and logo automatically.
 */
export function SchoolCombobox({ value, onChange, placeholder = "School or club" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value);
  const [options, setOptions] = React.useState<SchoolOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => setQuery(value), [value]);

  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/onboarding/schools?q=${encodeURIComponent(q)}`,
          { signal: ctl.signal },
        );
        if (r.ok) {
          const data = (await r.json()) as { schools: SchoolOption[] };
          setOptions(data.schools ?? []);
        }
      } catch {
        // ignore — combobox still accepts free text
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [query, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-md border border-white/15 bg-black/40 px-4 text-left text-base text-white",
            "focus-visible:border-bltz-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bltz-gold/40",
          )}
        >
          <span className={cn(value ? "text-white" : "text-white/40")}>
            {value || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-white/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-white/15 bg-[#0b1320]">
        {/* Override the cmdk Command's default `bg-popover` (which resolves
            to white under the light-theme tokens active on this app) so
            the dropdown stays dark-themed end-to-end. */}
        <Command shouldFilter={false} className="bg-transparent text-white">
          <CommandInput
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              // Free-text edits clear any previously-selected team ID since
              // the typed value may no longer match the picked school.
              onChange(v, { cfb_team_id: null });
            }}
            placeholder="Search schools…"
          />
          <CommandList>
            {loading ? (
              <div className="px-3 py-4 text-sm text-white/60">Searching…</div>
            ) : null}
            <CommandEmpty>
              <div className="px-3 py-2 text-sm text-white/70">
                Press Enter to use &ldquo;{query.trim() || "—"}&rdquo;.
              </div>
            </CommandEmpty>
            {options.length > 0 ? (
              <CommandGroup heading="Matches">
                {options.map((o) => {
                  const key = o.cfb_team_id ?? o.id ?? o.name;
                  return (
                    <CommandItem
                      key={key}
                      value={`${o.name}|${key}`}
                      onSelect={() => {
                        onChange(o.name, { cfb_team_id: o.cfb_team_id ?? null });
                        setOpen(false);
                      }}
                      // Override cmdk's default light "accent" selected state
                      // since our popover lives on a dark background. Selected
                      // and hover both use a slightly lighter navy so the
                      // white text and logos stay readable.
                      className="flex items-center gap-3 px-3 py-2 text-white !bg-transparent data-[selected=true]:!bg-white/10"
                    >
                      <span
                        aria-hidden="true"
                        className="relative h-7 w-7 flex-shrink-0 rounded bg-white/5 overflow-hidden"
                      >
                        {o.logo_url ? (
                          <Image
                            src={o.logo_url}
                            alt=""
                            fill
                            sizes="28px"
                            className="object-contain p-0.5"
                          />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white/50 font-oswald uppercase">
                            {initials(o.name)}
                          </span>
                        )}
                      </span>
                      <span className="flex-1 truncate text-white">{o.name}</span>
                      {o.hint ? (
                        <span className="ml-2 truncate text-xs text-white/50">
                          {o.hint}
                        </span>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
