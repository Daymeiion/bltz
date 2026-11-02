import type { ReactNode } from "react";

export type AvatarGroupItem = { id: string; label: string; initials?: string; mark?: ReactNode };

export function AvatarGroup({ items, max = 4, label = "Participants" }: { items: readonly AvatarGroupItem[]; max?: number; label?: string }) {
  const visible = items.slice(0, Math.max(0, max));
  const remainder = Math.max(0, items.length - visible.length);
  return (
    <div className="crm-avatar-group" aria-label={`${label}: ${items.map((item) => item.label).join(", ") || "none"}`}>
      {visible.map((item) => <span key={item.id} className="crm-avatar-group__avatar" title={item.label} aria-hidden>{item.mark ?? item.initials ?? item.label.slice(0, 2).toUpperCase()}</span>)}
      {remainder ? <span className="crm-avatar-group__remainder" aria-hidden>+{remainder}</span> : null}
    </div>
  );
}
