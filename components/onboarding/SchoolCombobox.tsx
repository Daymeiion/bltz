"use client";

import * as React from "react";
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
  id: string;
  name: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * School combobox. Hits `/api/onboarding/schools?q=...` for live search,
 * but accepts free-text — every athlete should be able to type their
 * school even if the school table doesn't have it yet.
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
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              onChange(v);
            }}
            placeholder="Search schools…"
          />
          <CommandList>
            {loading ? (
              <div className="px-3 py-4 text-sm text-white/60">Searching…</div>
            ) : null}
            <CommandEmpty>
              <div className="px-3 py-2 text-sm text-white/70">
                Press Enter to use “{query.trim() || "—"}”.
              </div>
            </CommandEmpty>
            {options.length > 0 ? (
              <CommandGroup heading="Matches">
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => {
                      onChange(o.name);
                      setOpen(false);
                    }}
                  >
                    {o.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
