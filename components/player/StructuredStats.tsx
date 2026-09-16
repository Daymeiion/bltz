import type { StoredStats } from "@/lib/player/structured-stats-types";
import { careerTotals, DISPLAY_STAT_FIELDS as STAT_FIELDS } from "@/lib/sportradar/types";

export function StructuredStats({ records }: { records: StoredStats[] }) {
  return <section aria-label="Career season statistics" className="space-y-3 px-[18px] pb-1 pt-[14px] text-white">
    <LeagueStats title="NFL" label="NFL" record={records.find(record => record.league === "nfl")} />
    <LeagueStats title="College Football" label="CFB" record={records.find(record => record.league === "ncaafb")} />
  </section>;
}

function LeagueStats({ title, label, record }: { title: string; label: string; record?: StoredStats }) {
  const seasonCount = new Set(record?.seasons.map(season => season.year) ?? []).size;
  const description = label === "CFB" ? "College football" : "NFL";
  return <details className="group/league overflow-hidden rounded-[14px] border border-[#1E2640] bg-[#131829]">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffbb00] [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[23px] font-black uppercase leading-none" style={{ fontFamily: "'Barlow','Oswald',Impact,sans-serif" }}>{title}</span>
          <span className="mt-2.5 block font-mono text-[10px] uppercase tracking-wider text-white/60">{label} season statistics · {seasonCount ? `${seasonCount} season${seasonCount === 1 ? "" : "s"} available` : "Season data pending"}</span>
        </span>
        <span aria-hidden="true" className="text-[22px] leading-none text-[#ffbb00] transition-transform group-open/league:rotate-180">⌄</span>
      </summary>
      <div className="space-y-3 border-t border-[#1E2640] p-3">
        {record?.seasons.length ? <StatsRecord record={record} /> : <>
          <div role="region" aria-label={`${label} season statistics`} tabIndex={0} className="overflow-x-auto rounded border border-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{description} statistics by season and team</caption>
              <thead><tr>{["Season", "Team", "GP", "GS"].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
              <tbody><tr className="border-t border-slate-700"><td colSpan={4} className="p-4 text-slate-300">{description} season statistics have not been added yet.</td></tr></tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">Saved season statistics will appear here. Career totals and game logs are shown separately.</p>
        </>}
      </div>
    </details>;
}

function StatsRecord({ record }: { record: StoredStats }) {
  return <div className="min-w-0 space-y-3">
      <h2 className="text-lg font-bold">{record.league === "nfl" ? "NFL" : "NCAA Football"} statistics</h2>
      <p className="text-sm text-slate-300">Source: {record.source} · {record.source.startsWith("Sports Reference") ? "Imported" : "Synced"} {record.syncedAt.slice(0, 10)}. Totals cover available seasons only.</p>
      {(["REG", "PST", "PRE"] as const).map(phase => {
        const seasons = record.seasons.filter(s => s.seasonType === phase).sort((a, b) => b.year - a.year);
        if (!seasons.length) return null;
        const totals = careerTotals(seasons);
        const keys = Object.keys(STAT_FIELDS).filter(key => seasons.some(s => s.statistics[key] !== undefined));
        const label = phase === "REG" ? (record.league === "ncaafb" ? "Season totals" : "Regular season") : phase === "PST" ? "Postseason" : "Preseason";
        const content = <>
          <p className="text-xs text-slate-300">{Math.min(...seasons.map(s => s.year))}–{Math.max(...seasons.map(s => s.year))} available coverage · — means unreported or incomplete.</p>
          <div className="overflow-x-auto rounded border border-slate-700" role="region" aria-label={`${record.league} ${phase} season statistics`} tabIndex={0}>
            <table className="w-full whitespace-nowrap text-left text-sm">
              <caption className="sr-only">Season statistics by team. Rates are shown per team and season only.</caption>
              <thead><tr><th className="p-3" scope="col">Season / team</th><th className="p-3" scope="col">GP</th><th className="p-3" scope="col">GS</th>{keys.map(key => <th className="p-3" scope="col" key={key}>{STAT_FIELDS[key].label}</th>)}</tr></thead>
              <tbody>{seasons.map(s => <tr key={`${s.year}-${s.providerTeamId}`} className="border-t border-slate-700">
                <th className="p-3 font-normal" scope="row">{s.year} · {s.team}{s.sourceNote && <span className="block text-xs text-slate-300">{s.sourceNote}</span>}</th><td className="p-3">{s.gamesPlayed ?? "—"}</td><td className="p-3">{s.gamesStarted ?? "—"}</td>
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
    </div>;
}
