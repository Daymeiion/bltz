"use client";
import { useState } from "react";
import { SUPER_BOWL_REFERENCE } from "@/lib/enrichment/award-reference-images";

function articleMetadata(meta: string) {
  const [source, ...details] = meta.split(" · ");
  const displaySource = source === source.toUpperCase()
    ? source.toLowerCase().replace(/\b\w+\b/g, word => /^(espn|nfl|ncaa|nba|nhl|mlb|cbs|nbc|abc|usa|ap|bbc)$/i.test(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1))
    : source;
  return [displaySource, ...details.map(detail => detail.toLowerCase())].join(" · ");
}

/** Shared article / honor presentation; actions only appear when there is a destination. */
export function EditorialCard({ title, image, description, meta, onClick, award = false, href, compactMobile = false, attribution }: {
  title: string; image?: string | null; description?: string; meta?: string;
  onClick?: () => void; award?: boolean; href?: string | null; compactMobile?: boolean;
  attribution?: string | null;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const visibleImage = image && image !== failedImage ? image : null;
  if (award) return <article className="flex w-[260px] flex-none self-start flex-col overflow-hidden rounded-[28px] bg-black p-2 text-center text-white">
    {visibleImage ? <img src={visibleImage} onError={() => setFailedImage(visibleImage)} onLoad={event => { if (event.currentTarget.naturalWidth <= 1 || event.currentTarget.naturalHeight <= 1) setFailedImage(visibleImage); }} referrerPolicy="no-referrer" alt="" loading="lazy" className="h-[180px] w-full shrink-0 rounded-[21px] object-contain p-3" /> : <div className="grid h-[180px] w-full shrink-0 place-items-center rounded-[21px] bg-[#121923] text-4xl text-[#ffbb00]" aria-hidden="true">★</div>}
    <div className="flex min-h-0 flex-col items-center px-3 pb-1 pt-2">
      <p className="text-xs text-[#ffbb00]">{meta || "unknown"}</p>
      <h3 title={title} className="mt-1 line-clamp-2 text-lg font-semibold leading-tight">{title}</h3>
      {description && <p className="mt-2 text-xs leading-4 text-white/60">{description}</p>}
      {visibleImage && attribution && <p className="mt-2 text-xs text-white/50">{attribution}</p>}
      {visibleImage === SUPER_BOWL_REFERENCE.canonical_image_url && <p className="mt-2 text-xs text-white/50">Illustration by <a href={SUPER_BOWL_REFERENCE.image_source_url} target="_blank" rel="noopener noreferrer" className="underline">Teo’s89</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY-SA 4.0</a> · unchanged</p>}
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Read article about ${title} (opens in a new tab)`} className="mt-3 flex min-h-11 shrink-0 items-center gap-4 rounded-full bg-white/10 py-1.5 pl-4 pr-1.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">Read article<span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-white text-lg text-black">↗</span></a> : <p className="mt-3 text-xs text-white/60">unknown</p>}
    </div>
  </article>;
  return <article className={`${compactMobile ? "preview-article-card " : ""}flex min-w-0 flex-col rounded-[28px] border border-white/10 bg-black p-2 text-center text-white`}>
    {visibleImage ? <img src={visibleImage} onError={() => setFailedImage(visibleImage)} onLoad={event => { if (event.currentTarget.naturalWidth <= 1 || event.currentTarget.naturalHeight <= 1) setFailedImage(visibleImage); }} referrerPolicy="no-referrer" alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[21px] object-cover" /> :
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-[21px] bg-[#121923] text-[#ffbb00]"><span className="text-4xl" aria-hidden="true">{onClick ? "↗" : "★"}</span><span className="text-xs text-white/60">Article image unavailable</span></div>}
    <div className="flex flex-1 flex-col items-center gap-3 px-3 py-5">
      <h3 className="text-lg font-semibold leading-tight">{title}</h3>
      {description && <p className="text-sm leading-relaxed text-white/60">{description}</p>}
      {onClick && <button type="button" onClick={onClick} className="mt-auto flex min-h-11 items-center gap-4 rounded-full bg-white/10 py-1.5 pl-4 pr-1.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">Read article<span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-white text-lg text-black">↗</span></button>}
      {meta && <p className="text-[#ffbb00]" style={{ fontSize: 9, textTransform: "none", letterSpacing: ".02em" }}>{articleMetadata(meta)}</p>}
    </div>
  </article>;
}
