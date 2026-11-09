"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrowBackUp, IconEyeOff } from "@tabler/icons-react";
import type { Dismissal } from "@/lib/enterprise-crm/pilot/dismissals-shared";

export type DismissChoice = { label: string; hint?: string; onSelect: () => void };

/** A small "Dismiss" button that opens a short list of choices. */
export function DismissMenu({ label = "Dismiss", choices, disabled = false }: { label?: string; choices: DismissChoice[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="pilot-dismiss" ref={ref} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <button type="button" className="pilot-dismiss__button" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}>
        <IconEyeOff stroke={1.5} aria-hidden />{label}
      </button>
      {open ? (
        <div className="pilot-dismiss__menu" role="menu">
          {choices.map((choice) => (
            <button key={choice.label} type="button" role="menuitem" onClick={() => { setOpen(false); choice.onSelect(); }}>
              <strong>{choice.label}</strong>{choice.hint ? <small>{choice.hint}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** What the school has hidden, with one-click restore. Collapsed by default. */
export function DismissedList({ items, noun, onRestore }: { items: Dismissal[]; noun: string; onRestore: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <details className="pilot-dismissed">
      <summary>Show dismissed {noun} ({items.length})</summary>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span><strong>{item.label ?? "Dismissed item"}</strong><small>{item.targetType === "signal" ? item.scope === "this_year" ? "Hidden this year" : "Hidden every year" : "Moment hidden"}{item.reason ? ` · ${item.reason}` : ""}</small></span>
            <button type="button" className="pilot-pill pilot-pill--quiet" onClick={() => onRestore(item.id)}><IconArrowBackUp stroke={1.5} aria-hidden />Restore</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
