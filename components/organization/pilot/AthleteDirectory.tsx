"use client";

import { useMemo, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import type { PilotRoster } from "@/lib/enterprise-crm/pilot/types";
import { Bezel, Eyebrow, PlayerMomentRow } from "./PilotPrimitives";
import { HeroTitle } from "./PilotMotion";

/** The school's Intelligence directory: every former player, each opening their intelligence file. */
export function AthleteDirectory({ schoolName, roster, profileBaseHref, preview = false }: { schoolName: string; roster: PilotRoster; profileBaseHref: string; preview?: boolean }) {
  const [query, setQuery] = useState("");
  const players = useMemo(() => {
    const needle = query.trim().toLowerCase();
    // Soonest moment first; players with nothing dated follow alphabetically.
    const sorted = [...roster.players].sort((a, b) => (a.next?.daysUntil ?? Infinity) - (b.next?.daysUntil ?? Infinity) || a.name.localeCompare(b.name));
    return needle ? sorted.filter((player) => player.name.toLowerCase().includes(needle)) : sorted;
  }, [query, roster.players]);

  return (
    <div className="pilot-page">
      {preview ? <p className="pilot-preview-note">Fictional preview · sample players, no live data</p> : null}

      <header className="pilot-hero pilot-hero--compact">
        <Eyebrow>{schoolName}</Eyebrow>
        <HeroTitle text="Every career still has chapters to write." />
        <p className="pilot-hero__lede">Open a former player to see their upcoming moments, career, posts and social reach.</p>
      </header>

      <Bezel label="Former players" index={1}>
        <div className="pilot-card-head">
          <div><h2>{roster.players.length} former players</h2><p>Soonest moment first</p></div>
          <label className="pilot-search">
            <IconSearch stroke={1.5} aria-hidden />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a player" aria-label="Find a player" />
          </label>
        </div>
        {roster.state === "unavailable" ? (
          <div className="pilot-empty"><strong>Players are temporarily unavailable.</strong><span>Try again in a few minutes.</span></div>
        ) : players.length > 0 ? (
          <ul className="pilot-rows">{players.map((player, index) => <PlayerMomentRow key={player.id} player={player} index={Math.min(index, 8)} profileHref={`${profileBaseHref}/${player.id}`} />)}</ul>
        ) : (
          <div className="pilot-empty">
            <strong>{roster.players.length ? "No player matches that name." : "No former players linked yet."}</strong>
            <span>{roster.players.length ? "Check the spelling or clear the search." : "BLTZ builds Lockers for your roster during onboarding."}</span>
          </div>
        )}
      </Bezel>
    </div>
  );
}
