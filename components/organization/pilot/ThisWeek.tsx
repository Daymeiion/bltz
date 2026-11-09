import Link from "next/link";
import { IconArrowUpRight, IconCalendarEvent, IconShare3, IconShieldCheck, IconUsers } from "@tabler/icons-react";
import type { PilotActivation, PilotRoster } from "@/lib/enterprise-crm/pilot/types";
import { ActivityPanel } from "./ActivityPanel";
import { PlayerColumn } from "./PlayerColumn";
import { Bezel, Eyebrow, PlayerMomentRow } from "./PilotPrimitives";
import { DismissibleNotice, HeroTitle } from "./PilotMotion";
import { AddSignal } from "./AddSignal";

const HOW_IT_WORKS = [
  { icon: IconUsers, title: "BLTZ builds the Lockers", body: "Every former player gets a fan Locker with their career, stats, photos and video." },
  { icon: IconCalendarEvent, title: "We flag the dates that matter", body: "Anniversaries, milestones and birthdays show up here before they happen." },
  { icon: IconShare3, title: "You share, fans show up", body: "Post the tracked Locker link on the day. Reach and fan visits come back here." },
] as const;

const HERO_TITLE = "Every legend deserves an encore.";

/** Overview: players on the left, this week's moments and activity in the center, what's next on the right. */
export function ThisWeek({ schoolName, roster, activity, intelligenceHref, organizationId, canAddSignal = false, preview = false }: {
  schoolName: string;
  /** With canAddSignal, staff can describe a date of their own for AI to draft. */
  organizationId?: string;
  canAddSignal?: boolean;
  roster: PilotRoster;
  activity: { state: "ready" | "unavailable"; activations: PilotActivation[] };
  intelligenceHref: string;
  preview?: boolean;
}) {
  const dated = roster.players.filter((player) => player.next).sort((a, b) => a.next!.daysUntil - b.next!.daysUntil);
  const actNow = dated.filter((player) => player.next!.daysUntil <= 7);
  const comingUp = dated.filter((player) => player.next!.daysUntil > 7 && player.next!.daysUntil <= 30);

  return (
    <div className="pilot-intel pilot-overview">
      {preview ? <p className="pilot-preview-note">Fictional preview · sample players, no live data</p> : null}

      <header className="pilot-hero">
        <Eyebrow>{schoolName}</Eyebrow>
        <HeroTitle text={HERO_TITLE} />
        {canAddSignal && organizationId ? <div className="pilot-hero__actions"><AddSignal organizationId={organizationId} players={roster.players} profileBaseHref={intelligenceHref} preview={preview} /></div> : null}
      </header>

      <DismissibleNotice storageKey="bltz-pilot-how-it-works" label="How the pilot works">
        <ol className="pilot-notice__steps">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            <li key={title}><Icon stroke={1.25} aria-hidden /><span><strong>{title}</strong>{body}</span></li>
          ))}
        </ol>
        <p className="pilot-notice__foot"><IconShieldCheck stroke={1.5} aria-hidden />BLTZ clears every photo and video before it appears on a Locker, so there is nothing for your staff to approve.</p>
      </DismissibleNotice>

      <div className="pilot-intel__grid">
        <PlayerColumn players={roster.players} baseHref={intelligenceHref} />

        <div className="pilot-intel__center">
          {roster.state === "unavailable" ? (
            <Bezel label="Signals unavailable">
              <div className="pilot-empty"><strong>Signals are temporarily unavailable.</strong><span>Your players and Lockers are unaffected. Try again in a few minutes.</span></div>
            </Bezel>
          ) : (
            <Bezel label="Act now">
              <div className="pilot-card-head">
                <div><h2>Act now</h2><p>Next 7 days</p></div>
                <span className="pilot-count">{actNow.length}</span>
              </div>
              {actNow.length > 0 ? (
                <ul className="pilot-rows">{actNow.map((player, index) => <PlayerMomentRow key={player.id} player={player} index={index} profileHref={`${intelligenceHref}/${player.id}`} />)}</ul>
              ) : (
                <div className="pilot-empty">
                  <strong>{roster.players.length ? "Nothing due in the next 7 days." : "No former players linked yet."}</strong>
                  <span>{roster.players.length ? "Coming-up moments are listed on the right." : "BLTZ builds Lockers for your roster during onboarding. They'll show up here automatically."}</span>
                </div>
              )}
            </Bezel>
          )}
          <ActivityPanel activity={activity} intelligenceHref={intelligenceHref} />
        </div>

        <aside className="pilot-intel__right" aria-label="Coming up and Lockers">
          <Bezel label="Coming up">
            <div className="pilot-card-head">
              <div><h2>Coming up</h2><p>8–30 days · prepare a post</p></div>
              <span className="pilot-count pilot-count--muted">{comingUp.length}</span>
            </div>
            {comingUp.length > 0 ? (
              <ul className="pilot-mini-list">
                {comingUp.slice(0, 6).map((player) => (
                  <li key={player.id}>
                    <Link href={`${intelligenceHref}/${player.id}`}><strong>{player.name}</strong><small>{player.next!.headline}</small></Link>
                    <em>{player.next!.daysUntil}d</em>
                  </li>
                ))}
              </ul>
            ) : <p className="pilot-quiet">Nothing scheduled in this window.</p>}
          </Bezel>

          <Bezel label="Fan Lockers" coreClassName="pilot-stat">
            <span className="pilot-stat__number">{roster.players.length}</span>
            <span className="pilot-stat__label">former players with a live fan Locker</span>
            <Link href={intelligenceHref} className="pilot-pill pilot-pill--ghost group">
              <span>Open Intelligence</span>
              <span className="pilot-pill__icon" aria-hidden><IconArrowUpRight stroke={1.5} /></span>
            </Link>
          </Bezel>
        </aside>
      </div>
    </div>
  );
}
