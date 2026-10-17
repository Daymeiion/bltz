import type { ReactNode } from "react";
import type { StoredStats } from "@/lib/player/structured-stats-types";
import { careerTotals, DISPLAY_STAT_FIELDS as STAT_FIELDS } from "@/lib/sportradar/types";
import { statColumnGroups, STAT_COLUMN_ABBREVIATIONS } from "@/lib/player/stat-column-groups";

export function StructuredStats({ records, nflFallback }: { records: StoredStats[]; nflFallback?: ReactNode }) {
  return <section aria-label="Career season statistics" className="space-y-3 px-[18px] pb-1 pt-[14px] text-white">
    <LeagueStats title="NFL" label="NFL" record={records.find(record => record.league === "nfl")} fallback={nflFallback} />
    <LeagueStats title="College Football" label="CFB" record={records.find(record => record.league === "ncaafb")} />
  </section>;
}

function LeagueStats({ title, label, record, fallback }: { title: string; label: string; record?: StoredStats; fallback?: ReactNode }) {
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
        {record?.seasons.length ? <StatsRecord record={record} /> : fallback ?? <>
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
      {(["REG", "PST", "PRE"] as const).map(phase => {
        const seasons = record.seasons.filter(s => s.seasonType === phase).sort((a, b) => b.year - a.year);
        if (!seasons.length) return null;
        const totals = careerTotals(seasons);
        const reported = phase === "REG" ? record.reportedCareerTotals : undefined;
        const groups = statColumnGroups([...seasons.map(season => season.statistics), ...(reported ? [reported.statistics] : [])]);
        const keys = groups.flatMap(group => group.keys);
        const gamesTotal = (key: "gamesPlayed" | "gamesStarted") => seasons.every(season => season[key] !== null) ? seasons.reduce((total, season) => total + (season[key] ?? 0), 0).toLocaleString("en-US") : "—";
        const label = phase === "REG" ? (record.league === "ncaafb" ? "Season totals" : "Regular season") : phase === "PST" ? "Postseason" : "Preseason";
        const content = <>
          <div className="max-w-full overflow-x-auto rounded border border-slate-700" role="region" aria-label={`${record.league} ${phase} season statistics`} tabIndex={0}>
            <table className="w-full whitespace-nowrap text-left text-xs [&_td]:px-2 [&_td]:py-2.5 [&_th]:px-2 [&_th]:py-2.5">
              <caption className="sr-only">Season statistics by team and category, with source-reported career totals when available. Rates are never summed. Longest returns use the maximum.</caption>
              <thead>
                <tr><th className="sticky left-0 z-10 bg-[#131829]" scope="col">Year / team</th><th scope="col" title="Games played" aria-label="Games played">GP</th><th scope="col" title="Games started" aria-label="Games started">GS</th>{keys.map(key => <th scope="col" key={key} title={STAT_FIELDS[key].label} aria-label={STAT_FIELDS[key].label}>{STAT_COLUMN_ABBREVIATIONS[key] ?? STAT_FIELDS[key].label}</th>)}</tr>
              </thead>
              <tbody>{seasons.map(s => <tr key={`${s.year}-${s.providerTeamId}`} className="border-t border-slate-700">
                <th className="sticky left-0 bg-[#131829] font-normal" scope="row">{s.year} · {s.team}{s.sourceNote && <span className="block text-xs text-slate-300">{s.sourceNote}</span>}</th><td>{s.gamesPlayed ?? "—"}</td><td>{s.gamesStarted ?? "—"}</td>
                {keys.map(key => <td className="p-3 tabular-nums" key={key}>{s.statistics[key]?.toLocaleString("en-US") ?? "—"}</td>)}
              </tr>)}</tbody>
              <tfoot>
                {reported && <tr className="border-t border-slate-500"><th className="sticky left-0 bg-[#131829] text-[#ffbb00]" scope="row" title="Career totals reported by Pro Football Reference" aria-label="Career totals reported by Pro Football Reference">PFR career</th><td>{reported.gamesPlayed?.toLocaleString("en-US") ?? "—"}</td><td>{reported.gamesStarted?.toLocaleString("en-US") ?? "—"}</td>{keys.map(key => <td className="font-semibold" key={key}>{reported.statistics[key]?.toLocaleString("en-US") ?? "—"}</td>)}</tr>}
                <tr className="border-t border-slate-500"><th className="sticky left-0 bg-[#131829]" scope="row" title="Available-season totals" aria-label="Available-season totals">{reported ? "Season sum" : "Totals"}</th><td>{gamesTotal("gamesPlayed")}</td><td>{gamesTotal("gamesStarted")}</td>{keys.map(key => <td className="font-semibold" key={key}>{totals[key]?.toLocaleString("en-US") ?? "—"}</td>)}</tr>
              </tfoot>
            </table>
          </div>
          {record.sourceUrls?.map(url => <p key={url} className="text-xs leading-relaxed text-slate-300">
            {record.league === "nfl" && /^https:\/\/(?:www\.)?pro-football-reference\.com\/players\//.test(url) ? <>Statistics courtesy of <a href={url} target="_blank" rel="noopener noreferrer" className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">Pro-Football-Reference.com</a>, a <a href="https://www.sports-reference.com/" target="_blank" rel="noopener noreferrer" className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">Sports Reference</a> site.</> : <a href={url} target="_blank" rel="noopener noreferrer" className="underline">View source player page</a>}
          </p>)}
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
