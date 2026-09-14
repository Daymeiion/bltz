"use client";

/** Shared article / honor presentation; actions only appear when there is a destination. */
export function EditorialCard({ title, image, description, meta, onClick, award = false, href, compactMobile = false }: {
  title: string; image?: string | null; description?: string; meta?: string;
  onClick?: () => void; award?: boolean; href?: string | null; compactMobile?: boolean;
}) {
  if (award) return <article className="flex h-[400px] w-[260px] flex-none self-start flex-col overflow-hidden rounded-[28px] bg-black p-2 text-center text-white">
    {image ? <img src={image} alt="" loading="lazy" className="h-[180px] w-full shrink-0 rounded-[21px] object-cover" /> : <div className="grid h-[180px] w-full shrink-0 place-items-center rounded-[21px] bg-[#121923] text-4xl text-[#ffbb00]" aria-hidden="true">★</div>}
    <div className="flex min-h-0 flex-1 flex-col items-center px-3 pb-2 pt-2">
      <p className="text-xs text-[#ffbb00]">{meta || "unknown"}</p>
      <h3 title={title} className="mt-1 line-clamp-2 text-lg font-semibold leading-tight">{title}</h3>
      {description && <p className="mt-2 text-xs leading-4 text-white/60">{description}</p>}
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Read article about ${title} (opens in a new tab)`} className="mt-auto flex min-h-11 items-center gap-3 rounded-full bg-white/10 py-1 pl-4 pr-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">Read article<span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-white text-lg text-black">↗</span></a> : <p className="mt-auto py-3 text-xs text-white/60">unknown</p>}
    </div>
  </article>;
  return <article className={`${compactMobile ? "preview-article-card " : ""}flex min-w-0 flex-col rounded-[28px] border border-white/10 bg-black p-2 text-center text-white`}>
    {image ? <img src={image} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[21px] object-cover" /> :
      <div className="flex aspect-[4/3] items-center justify-center rounded-[21px] bg-[#121923] text-4xl text-[#ffbb00]" aria-hidden="true">{onClick ? "↗" : "★"}</div>}
    <div className="flex flex-1 flex-col items-center gap-3 px-3 py-5">
      {meta && <p className="text-[10px] uppercase tracking-widest text-[#ffbb00]">{meta}</p>}
      <h3 className="text-lg font-semibold leading-tight">{title}</h3>
      {description && <p className="text-sm leading-relaxed text-white/60">{description}</p>}
      {onClick && <button type="button" onClick={onClick} className="mt-auto flex min-h-11 items-center gap-4 rounded-full bg-white/10 py-1.5 pl-4 pr-1.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">Read article<span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-white text-lg text-black">↗</span></button>}
    </div>
  </article>;
}
