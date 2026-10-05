import Link from "next/link";
import { contentItemsFromEvidence, contentRecency } from "@/lib/intelligence/content";
import { confidenceLabel, safeSourceUrl } from "@/lib/intelligence/lab-format";
import type { GraphEvidence } from "@/lib/intelligence/contracts";

const contextLabels = { career_era: "Career-era coverage", postcareer: "Post-career content", unknown: "Career context unknown" };
const recencyLabels = { recent: "Published within 30 days", historical: "Historical content", incomplete: "Recency not established", future: "Not known at evaluation time" };

export function ContentEvidence({ evidence, evaluatedAt, available }: { evidence: GraphEvidence[]; evaluatedAt: string; available: boolean }) {
  const items = contentItemsFromEvidence(evidence);
  return <section aria-label="News, interviews & video" className="min-w-0 rounded-md border border-neutral-300 bg-white p-5 dark:border-neutral-800 dark:bg-[#111318]">
    <h2 className="mb-2 text-lg font-semibold">News, interviews & video</h2>
    <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">Source-backed content attached to this Athlete Career ID. Publication, video release and the event described are separate dates. Links do not establish usage clearance.</p>
    {!available ? <p role="status" className="text-sm text-amber-700 dark:text-amber-300">Content evidence could not be loaded.</p> : !items.length ? <p className="text-sm text-neutral-600 dark:text-neutral-400">No reviewed content evidence is attached.</p> : <ul className="space-y-5">
      {items.map(item => {
        const href = safeSourceUrl(item.url);
        const sourceHref = safeSourceUrl(item.sourceUrl);
        return <li key={item.evidenceId} className="border-l-2 border-neutral-300 pl-3 dark:border-neutral-700">
          <p className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{contextLabels[item.careerContext]} · {item.contentType} · {item.status}</p>
          <h3 className="mt-1 font-semibold">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-neutral-500 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">{item.title}</a> : item.title}</h3>
          <p className="mt-1 text-sm">{item.assertion}</p>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="text-neutral-600 dark:text-neutral-400">Published</dt><dd>{item.publishedOn ?? "Unknown"}</dd></div>
            <div><dt className="text-neutral-600 dark:text-neutral-400">Video / audio release</dt><dd>{item.releasedOn ?? "Unknown"}</dd></div>
            <div><dt className="text-neutral-600 dark:text-neutral-400">Described event</dt><dd>{item.describedEventOn ?? "Not established"}</dd></div>
            <div><dt className="text-neutral-600 dark:text-neutral-400">Fetched</dt><dd className="break-all">{item.fetchedAt ?? "Unknown"}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{item.publisher} · {confidenceLabel(item.matchConfidence)} · {recencyLabels[contentRecency(item, evaluatedAt)]}</p>
          {item.metadataDateBasis && <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Date basis: {item.metadataDateBasis}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href={`#evidence-${item.evidenceId}`} className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">Inspect supporting evidence</Link>
            {sourceHref && sourceHref !== href && <a href={sourceHref} target="_blank" rel="noopener noreferrer" className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">Publisher source</a>}
          </div>
        </li>;
      })}
    </ul>}
  </section>;
}
