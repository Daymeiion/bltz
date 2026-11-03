import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { IconArrowUpRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { PilotPlayer } from "@/lib/enterprise-crm/pilot/types";
import { VERDICT_LABEL, whenLabel } from "@/lib/intelligence/signal-copy";
import { CopyLockerLink } from "./CopyLockerLink";

/** Outer tray + inner plate: every major surface sits in a machined shell. */
export function Bezel({ children, className, coreClassName, as: Tag = "section", label, index = 0 }: {
  children: ReactNode;
  className?: string;
  coreClassName?: string;
  as?: "section" | "div" | "article";
  label?: string;
  index?: number;
}) {
  return (
    <Tag className={cn("pilot-bezel pilot-reveal", className)} aria-label={label} style={{ "--pilot-i": index } as CSSProperties}>
      <div className={cn("pilot-bezel__core", coreClassName)}>{children}</div>
    </Tag>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="pilot-eyebrow">{children}</span>;
}

export function LockerButton({ href, label = "Open Locker" }: { href: string; label?: string }) {
  return (
    <Link href={href} target="_blank" rel="noopener" className="pilot-pill pilot-pill--primary group">
      <span>{label}</span>
      <span className="pilot-pill__icon" aria-hidden><IconArrowUpRight stroke={1.5} /></span>
    </Link>
  );
}

export function Portrait({ player, size = "md" }: { player: Pick<PilotPlayer, "name" | "portraitUrl">; size?: "md" | "lg" }) {
  const initials = player.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <span className={cn("pilot-portrait", size === "lg" && "pilot-portrait--lg")} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- portraits come from approved Locker hosts */}
      {player.portraitUrl ? <img src={player.portraitUrl} alt="" /> : <span>{initials}</span>}
    </span>
  );
}

export function WhenChip({ daysUntil, verdict }: { daysUntil: number; verdict: NonNullable<PilotPlayer["next"]>["verdict"] }) {
  return (
    <span className={cn("pilot-when", `pilot-when--${verdict}`)}>
      <span className="sr-only">{VERDICT_LABEL[verdict]}: </span>{whenLabel(daysUntil)}
    </span>
  );
}

/** One former player, their next moment, and the two things a school can do. */
export function PlayerMomentRow({ player, index, profileHref }: { player: PilotPlayer; index: number; profileHref?: string }) {
  const meta = [player.position, player.team].filter(Boolean).join(" · ");
  return (
    <li className="pilot-row pilot-reveal" style={{ "--pilot-i": index } as CSSProperties}>
      <Portrait player={player} />
      <div className="pilot-row__copy">
        {profileHref ? <Link href={profileHref} className="pilot-row__name">{player.name}</Link> : <strong>{player.name}</strong>}
        <span>{player.next ? player.next.headline : "No dated moment on file yet"}{meta ? <em> · {meta}</em> : null}</span>
      </div>
      {player.next ? <WhenChip daysUntil={player.next.daysUntil} verdict={player.next.verdict} /> : <span />}
      <div className="pilot-row__actions">
        <CopyLockerLink href={player.lockerHref} name={player.name} />
        <LockerButton href={player.lockerHref} />
      </div>
    </li>
  );
}
