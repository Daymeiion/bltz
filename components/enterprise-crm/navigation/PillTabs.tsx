"use client";

import Link from "next/link";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type PillTabItem = {
  id: string;
  label: string;
  href?: string;
  disabled?: boolean;
};

export type PillTabsProps = {
  items: readonly PillTabItem[];
  currentId: string;
  label: string;
  onChange?: (id: string) => void;
  className?: string;
};

export function PillTabs({ items, currentId, label, onChange, className }: PillTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const interactive = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.disabled && !item.href);

  function move(event: KeyboardEvent<HTMLButtonElement>, itemIndex: number) {
    const current = interactive.findIndex(({ index }) => index === itemIndex);
    if (current < 0) return;
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % interactive.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + interactive.length) % interactive.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = interactive.length - 1;
    else return;
    event.preventDefault();
    const target = interactive[next];
    onChange?.(target.item.id);
    refs.current[target.index]?.focus();
  }

  const hasPanels = items.some((item) => !item.href);

  return (
    <div className={cn("crm-pill-tabs", className)} role={hasPanels ? "tablist" : undefined} aria-label={label} data-overflow="scroll">
      {items.map((item, index) => {
        const current = item.id === currentId;
        const classNames = cn("crm-pill-tab", current && "crm-pill-tab--current");
        if (item.disabled) {
          return <span key={item.id} className={classNames} aria-disabled="true">{item.label}<span className="sr-only"> unavailable</span></span>;
        }
        if (item.href) {
          return <Link key={item.id} href={item.href} aria-current={current ? "page" : undefined} className={classNames}>{item.label}</Link>;
        }
        return (
          <button
            key={item.id}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={current}
            tabIndex={current ? 0 : -1}
            className={classNames}
            onClick={() => onChange?.(item.id)}
            onKeyDown={(event) => move(event, index)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
