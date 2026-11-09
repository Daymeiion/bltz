import { formatFollowers, type BriefContent } from "@/lib/enterprise-crm/pilot/briefs-shared";

const PLATFORM: Record<string, string> = { instagram: "Instagram", x: "X", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok", youtube: "YouTube" };

function longDate(date: string | null): string | null {
  if (!date) return null;
  if (/^\d{4}$/.test(date)) return date;
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * A partnership brief as a brand reads it: the pitch, the athlete, reach, brands
 * already attached and the channels ready to go. Printable as a PDF.
 */
export function BriefDocument({ content, preparedFor = true }: { content: BriefContent; preparedFor?: boolean }) {
  const { facts, narrative, recipient } = content;
  const { athlete, reach } = facts;
  const stats = [
    reach.totalFollowers > 0 ? { value: formatFollowers(reach.totalFollowers), label: "Social followers" } : null,
    reach.impressions > 0 ? { value: formatFollowers(reach.impressions), label: "Reach from school activations" } : null,
    reach.engagements > 0 ? { value: formatFollowers(reach.engagements), label: "Engagements" } : null,
    reach.lockerVisits > 0 ? { value: formatFollowers(reach.lockerVisits), label: "Fan Locker visits from activations" } : null,
  ].filter((row): row is { value: string; label: string } => row !== null);

  return (
    <article className="brief">
      <header className="brief__head">
        <div className="brief__eyebrow">{facts.school.name}{preparedFor ? <> · Prepared for {recipient.brandName}</> : null}</div>
        <h1>{narrative.headline}</h1>
        <p className="brief__summary">{narrative.summary}</p>
      </header>

      <section className="brief__athlete" aria-label="Athlete">
        {/* eslint-disable-next-line @next/next/no-img-element -- snapshot image from the brief */}
        {athlete.portraitUrl ? <img src={athlete.portraitUrl} alt={athlete.name} /> : <span className="brief__initials" aria-hidden>{athlete.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span>}
        <div>
          <h2>{athlete.name}</h2>
          <p>{[athlete.position, athlete.team].filter(Boolean).join(" · ")}</p>
          <a href={athlete.lockerUrl} target="_blank" rel="noopener noreferrer">View the fan Locker</a>
        </div>
      </section>

      <section aria-label="Why this partnership">
        <h3>Why it fits</h3>
        <p>{narrative.fit}</p>
      </section>

      {stats.length || reach.followers.length ? (
        <section aria-label="Reach">
          <h3>Reach</h3>
          {stats.length ? <dl className="brief__stats">{stats.map((stat) => <div key={stat.label}><dd>{stat.value}</dd><dt>{stat.label}</dt></div>)}</dl> : null}
          {reach.followers.length ? <ul className="brief__chips">{reach.followers.map((row) => <li key={row.platform}>{PLATFORM[row.platform] ?? row.platform}{row.handle ? ` ${row.handle}` : ""} · <b>{formatFollowers(row.followers)}</b></li>)}</ul> : null}
          {reach.activationsPosted ? <p className="brief__note">From {reach.activationsPosted} activation{reach.activationsPosted === 1 ? "" : "s"} {facts.school.name} has run with {athlete.name.split(/\s+/)[0]}.</p> : null}
        </section>
      ) : null}

      {narrative.ideas.length ? (
        <section aria-label="Partnership ideas">
          <h3>Partnership ideas</h3>
          <ol className="brief__ideas">
            {narrative.ideas.map((idea) => (
              <li key={idea.title}><strong>{idea.title}</strong><span>{idea.channel} · {idea.timing}</span><p>{idea.description}</p></li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-label="Ready to go">
        <h3>Ready to go</h3>
        <div className="brief__columns">
          <div>
            <h4>Fan Locker placements</h4>
            <ul>{facts.channels.locker.map((row) => <li key={row.label}><strong>{row.label}</strong> {row.description}</li>)}</ul>
          </div>
          {facts.channels.upcoming.length || facts.channels.planned.length ? (
            <div>
              <h4>Coming up</h4>
              <ul>
                {facts.channels.upcoming.map((row) => <li key={`${row.headline}-${row.targetDate}`}><strong>{longDate(row.targetDate)}</strong> {row.headline}</li>)}
                {facts.channels.planned.map((row) => <li key={row.title}><strong>{row.dueOn ? longDate(row.dueOn) : "Planned"}</strong> {row.title}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {facts.highlights.length || facts.seasons.length ? (
        <section aria-label="Career">
          <h3>Career highlights</h3>
          <ul className="brief__list">
            {facts.highlights.map((row) => <li key={row.title}><strong>{row.title}</strong>{row.date ? ` · ${longDate(row.date)}` : ""}{row.stats.length ? ` · ${row.stats.map((stat) => `${stat.value} ${stat.label}`).join(", ")}` : ""}</li>)}
            {facts.seasons.map((row) => <li key={row.season}><strong>{row.season}</strong>{row.team ? ` · ${row.team}` : ""} · {row.line}</li>)}
          </ul>
        </section>
      ) : null}

      {facts.brands.length ? (
        <section aria-label="Brands and businesses">
          <h3>Brands and businesses</h3>
          <ul className="brief__list">{facts.brands.map((row) => <li key={row.name}><strong>{row.name}</strong>{row.note ? ` · ${row.note}` : ""}</li>)}</ul>
        </section>
      ) : null}

      {facts.coverage.length ? (
        <section aria-label="In the press">
          <h3>In the press</h3>
          <ul className="brief__list">{facts.coverage.map((row) => <li key={row.url}><a href={row.url} target="_blank" rel="noopener noreferrer">{row.title}</a> · {row.publisher}{row.date ? `, ${longDate(row.date)}` : ""}</li>)}</ul>
        </section>
      ) : null}

      <footer className="brief__foot">
        Prepared by {facts.school.name} on {longDate(facts.generatedAt)} with BLTZ. Shared with the athlete&apos;s approval. Figures reflect the school&apos;s records on that date.
      </footer>
    </article>
  );
}
