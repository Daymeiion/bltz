import Link from "next/link";
import type { PilotActivation } from "@/lib/enterprise-crm/pilot/types";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

/** Overlapping headshots of everyone featured; hovering shows the name, clicking opens their intelligence. */
export function AthleteAvatars({ athletes, baseHref, max = 4 }: { athletes: PilotActivation["athletes"]; baseHref: string; max?: number }) {
  if (!athletes.length) return null;
  const shown = athletes.slice(0, max);
  const extra = athletes.length - shown.length;
  return (
    <span className="pilot-avatars">
      {shown.map((athlete) => (
        <Link key={athlete.id} href={`${baseHref}/${athlete.id}`} className="pilot-avatar" aria-label={`Open ${athlete.name}'s intelligence`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- portraits come from approved Locker hosts */}
          {athlete.portraitUrl ? <img src={athlete.portraitUrl} alt="" /> : <span aria-hidden>{initials(athlete.name)}</span>}
          <span className="pilot-avatar__name" role="tooltip">{athlete.name}</span>
        </Link>
      ))}
      {extra > 0 ? <span className="pilot-avatar pilot-avatar--more" title={athletes.slice(max).map((athlete) => athlete.name).join(", ")}>+{extra}</span> : null}
    </span>
  );
}
