// components/AwardCard.tsx
type Props = {
  award_name: string;
  award_short_desc: string;
  year: string | number;
  source: { site: string; url: string };
  team_or_school?: string;
  league?: string;
};
export default function AwardCard(p: Props) {
  return (
    <div className="rounded-2xl bg-neutral-900/60 p-4 border border-white/10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{p.award_name}</h3>
        <span className="text-sm opacity-80">{String(p.year)}</span>
      </div>
      <p className="mt-2 text-sm opacity-90">{p.award_short_desc}</p>
      <div className="mt-3 flex items-center gap-3 text-xs opacity-75">
        {p.team_or_school && <span>{p.team_or_school}</span>}
        {p.league && <span>• {p.league}</span>}
        <a className="underline ml-auto" href={p.source.url} target="_blank" rel="noreferrer">
          {p.source.site}
        </a>
      </div>
    </div>
  );
}
