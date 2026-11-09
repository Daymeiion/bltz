"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { IconSearch } from "@tabler/icons-react";
import type { PilotPlayer } from "@/lib/enterprise-crm/pilot/types";
import { Bezel, Portrait } from "./PilotPrimitives";

/**
 * Searchable list of the school's former players; each opens their intelligence file.
 * Filters on every keystroke. On stacked (narrow) layouts it is a dropdown: closed until
 * someone types, then it shows the top three matches.
 */
export function PlayerColumn({ players, currentId = null, baseHref }: { players: PilotPlayer[]; currentId?: string | null; baseHref: string }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const sorted = [...players].sort((a, b) => (a.next?.daysUntil ?? Infinity) - (b.next?.daysUntil ?? Infinity) || a.name.localeCompare(b.name));
  const shown = needle ? sorted.filter((row) => row.name.toLowerCase().includes(needle)) : sorted;
  const listId = useId();
  return (
    <nav className="pilot-intel__left" aria-label="Former players">
      <Bezel as="div" coreClassName={needle ? "pilot-players pilot-players--open" : "pilot-players"}>
        <label className="pilot-search pilot-search--block"><IconSearch stroke={1.5} aria-hidden /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }} placeholder="Find a player" aria-label="Find a player" aria-controls={listId} /></label>
        <p className="pilot-players__count">{players.length} former players</p>
        <ul id={listId}>
          {shown.map((row) => (
            <li key={row.id}>
              <Link href={`${baseHref}/${row.id}`} aria-current={row.id === currentId ? "page" : undefined} className="pilot-players__row">
                {row.id === currentId ? <motion.span layoutId="pilot-player-pill" className="pilot-players__pill" transition={{ type: "spring", stiffness: 380, damping: 34 }} /> : null}
                <Portrait player={row} />
                <span><strong>{row.name}</strong><small>{row.next ? row.next.headline : row.position ?? "Former player"}</small></span>
                {row.next ? <em className={`pilot-players__when pilot-players__when--${row.next.verdict}`}>{row.next.daysUntil}d</em> : null}
              </Link>
            </li>
          ))}
        </ul>
        {!shown.length ? <p className="pilot-quiet">{players.length ? "No player matches that name." : "Former players appear here once BLTZ builds their Lockers."}</p> : null}
      </Bezel>
    </nav>
  );
}
