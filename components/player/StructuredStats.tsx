import type { StoredStats } from "@/lib/player/structured-stats-types";
import { careerTotals, STAT_FIELDS } from "@/lib/sportradar/types";

export function StructuredStats({ records }: { records: StoredStats[] }) {
  return <section aria-label="Verified career statistics" className="space-y-6 p-4 text-white">
    {records.map(record => <div key={record.league} className="space-y-3">
      <h2 className="text-lg font-bold">{record.league === "nfl" ? "NFL" : "NCAA Football"} statistics</h2>
      <p className="text-sm text-slate-300">Source: {record.source} · Synced {record.syncedAt.slice(0, 10)}. Totals cover available seasons only.</p>
      {(["REG", "PST", "PRE"] as const).map(phase => {
        const seasons = record.seasons.filter(s => s.seasonType === phase).sort((a, b) => b.year - a.year);
        if (!seasons.length) return null;
        const totals = careerTotals(seasons);
        const keys = Object.keys(STAT_FIELDS).filter(key => seasons.some(s => s.statistics[key] !== undefined));
        const label = phase === "REG" ? "Regular season" : phase === "PST" ? "Postseason" : "Preseason";
        const content = <>
          <p className="text-xs text-slate-300">{Math.min(...seasons.map(s => s.year))}–{Math.max(...seasons.map(s => s.year))} available coverage · — means unreported or incomplete.</p>
          <div className="overflow-x-auto rounded border border-slate-700" role="region" aria-label={`${record.league} ${phase} season statistics`} tabIndex={0}>
            <table className="w-full whitespace-nowrap text-left text-sm">
              <caption className="sr-only">Season statistics by team. Rates are shown per team and season only.</caption>
              <thead><tr><th className="p-3" scope="col">Season / team</th><th className="p-3" scope="col">GP</th><th className="p-3" scope="col">GS</th>{keys.map(key => <th className="p-3" scope="col" key={key}>{STAT_FIELDS[key].label}</th>)}</tr></thead>
              <tbody>{seasons.map(s => <tr key={`${s.year}-${s.providerTeamId}`} className="border-t border-slate-700">
                <th className="p-3 font-normal" scope="row">{s.year} · {s.team}</th><td className="p-3">{s.gamesPlayed ?? "—"}</td><td className="p-3">{s.gamesStarted ?? "—"}</td>
                {keys.map(key => <td className="p-3 tabular-nums" key={key}>{s.statistics[key]?.toLocaleString("en-US") ?? "—"}</td>)}
              </tr>)}</tbody>
              <tfoot><tr className="border-t border-slate-500"><th className="p-3" scope="row">Available-season totals</th><td className="p-3">—</td><td className="p-3">—</td>{keys.map(key => <td className="p-3 font-semibold" key={key}>{totals[key]?.toLocaleString("en-US") ?? "—"}</td>)}</tr></tfoot>
            </table>
          </div>
        </>;
        return phase === "REG" ? <div key={phase} className="space-y-2">
          <h3 className="font-semibold text-[#ffbb00]">{label}</h3>
          {content}
        </div> : <details key={phase} className="group overflow-hidden rounded-[14px] border border-[#1E2640] bg-[#131829]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffbb00] [&::-webkit-details-marker]:hidden">
            <h3 className="font-semibold text-[#ffbb00]">{label}</h3>
            <span aria-hidden="true" className="text-[22px] leading-none text-[#ffbb00] transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-2 border-t border-[#1E2640] p-3">{content}</div>
        </details>;
      })}
    </div>)}
  </section>;
}
