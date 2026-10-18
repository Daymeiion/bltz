import { jerseyBadge, jerseyNumber, type JerseyBadge } from "@/lib/player/jersey-history";

export function JerseyNumberRow({ history = [], values = [], fallback }: { history?: JerseyBadge[]; values?: string[]; fallback: string }) {
  const badges = history.length ? history : [...new Set(values.flatMap(value => jerseyNumber(value) ?? []))].map(number => jerseyBadge({ team: "Team not recorded", number }));
  return <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: ".12em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>JERSEY NUMBERS</span>
    {badges.length ? <div role="list" aria-label="Jersey numbers by team" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {badges.map(item => <span role="listitem" key={`${item.team}:${item.number}`}>
        <span role="img" aria-label={`${item.team} #${item.number}`} title={`${item.team} · #${item.number}`} style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", minWidth: 36, height: 40, boxSizing: "border-box", border: `3px solid ${item.borderColor}`, padding: "0 4px", background: item.color, color: item.textColor, fontFamily: "'Barlow','Oswald',Impact,sans-serif", fontSize: 23, fontWeight: 800, lineHeight: 1 }}>{item.number}</span>
      </span>)}
    </div> : <span style={{ color: "#fff", fontSize: 15 }}>{fallback}</span>}
  </div>;
}
