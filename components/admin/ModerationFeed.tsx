"use client";

import { useEffect, useMemo, useState } from "react";

type ModerationItem = {
  id: string;
  type: "bug" | "report" | "appeal" | "system";
  title: string;
  description?: string;
  severity?: "low" | "medium" | "high" | "critical";
  reportedBy?: string;
  createdAt: string; // ISO date
  status: "open" | "in_review" | "resolved" | "closed";
  link?: string;
};

const SEVERITY_TO_COLOR: Record<NonNullable<ModerationItem["severity"]>, string> = {
  low: "bg-[#A3A3A3]",
  medium: "bg-[#FFCA33]",
  high: "bg-[#000CF5]",
  critical: "bg-rose-500",
};

const STATUS_TO_TEXT: Record<ModerationItem["status"], string> = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  closed: "Closed",
};

export function ModerationFeed({
  items,
  title = "Moderation & Reports",
  className = "",
  limit = 20,
}: {
  items?: ModerationItem[];
  title?: string;
  className?: string;
  limit?: number;
}) {
  const fallback = useMemo<ModerationItem[]>(
    () =>
      items ?? [
        {
          id: "m1",
          type: "bug",
          title: "Chart labels overflow on small screens",
          description: "x-axis labels overlap on devices < 360px width",
          severity: "medium",
          reportedBy: "QA Bot",
          createdAt: new Date().toISOString(),
          status: "open",
          link: "/admin/analytics",
        },
        {
          id: "m2",
          type: "report",
          title: "Player reported for spam messaging",
          description: "User @fastShooter sent 40+ unsolicited messages in 10m",
          severity: "high",
          reportedBy: "@fan_482",
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          status: "in_review",
          link: "/admin/users",
        },
        {
          id: "m3",
          type: "appeal",
          title: "Appeal: temporary block on @creatorJ",
          description: "Requests unblock after 24h; claims false positives",
          severity: "low",
          reportedBy: "@creatorJ",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          status: "open",
        },
        {
          id: "m4",
          type: "system",
          title: "RLS policy denies analytics read for admin shadow user",
          description: "Check Supabase row level security for analytics tables",
          severity: "critical",
          reportedBy: "System",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
          status: "resolved",
        },
      ],
    [items]
  );

  const [data, setData] = useState<ModerationItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [preview, setPreview] = useState<ModerationItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/moderations?limit=${limit}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("bad status");
        const json = (await res.json()) as any[];
        if (cancelled) return;
        const normalized: ModerationItem[] = json.map((i) => ({
          id: i.id,
          type: i.type,
          title: i.title,
          description: i.description ?? undefined,
          severity: i.severity ?? undefined,
          reportedBy: i.reported_by ?? undefined,
          createdAt: i.created_at,
          status: i.status,
          link: i.link ?? undefined,
        }));
        setData(normalized);
      } catch (e) {
        if (!cancelled) setData(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [limit, fallback]);

  return (
    <div className={`rounded-xl border border-[#1f1f1f] bg-[#0b0b0b]/60 backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between px-3 md:px-5 py-2 md:py-4 border-b border-[#1f1f1f]">
        <h2 className="text-base md:text-xl font-semibold text-white truncate">{title}</h2>
        <span className="text-xs md:text-sm text-[#A3A3A3] whitespace-nowrap ml-2">{(data ?? fallback).length} items</span>
      </div>

      <ul className="divide-y divide-[#1f1f1f]">
        {(data ?? fallback).map((item) => (
          <li key={item.id} className="p-3 md:p-5 hover:bg-white/5 transition-colors">
            <div className="flex items-start gap-2 md:gap-4">
              {/* Type dot */}
              <span
                className={`mt-1 inline-block h-2.5 w-2.5 md:h-3 md:w-3 rounded-full ${
                  item.severity ? SEVERITY_TO_COLOR[item.severity] : "bg-[#474747]"
                }`}
                aria-hidden
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1 md:gap-2">
                  <p className="text-xs md:text-base font-medium text-white truncate">
                    {item.title}
                  </p>
                  <span className="text-[10px] md:text-xs text-[#A3A3A3] whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {item.description ? (
                  <p className="mt-1 text-[10px] md:text-sm text-[#A3A3A3] line-clamp-1 md:line-clamp-2">
                    {item.description}
                  </p>
                ) : null}

                <div className="mt-1.5 md:mt-2 flex flex-wrap items-center gap-1 md:gap-3">
                  {item.severity ? (
                    <span className="inline-flex items-center rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] md:text-xs text-[#A3A3A3]">
                      {item.severity}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] md:text-xs text-[#A3A3A3]">
                    {STATUS_TO_TEXT[item.status]}
                  </span>
                  {item.reportedBy ? (
                    <span className="inline-flex items-center rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] md:text-xs text-[#A3A3A3] truncate max-w-[120px]">
                      {item.reportedBy}
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                onClick={() => setPreview(item)}
                className="shrink-0 text-[10px] md:text-sm text-[#FFCA33] hover:underline whitespace-nowrap"
                title="View details"
              >
                View
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-4 py-3 md:px-5 md:py-4 border-t border-[#1f1f1f] text-right">
        <a href="/admin/moderation" className="text-xs md:text-sm text-[#000CF5] hover:underline">
          Go to Moderation Center
        </a>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-2xl rounded-xl border border-[#1f1f1f] bg-[#0b0b0b]">
            <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 border-b border-[#1f1f1f]">
              <h3 className="text-white font-semibold">{preview.title}</h3>
              <button 
                onClick={() => setPreview(null)} 
                className="text-[#A3A3A3] hover:text-white p-1 rounded hover:bg-white/10"
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] md:text-xs text-[#A3A3A3] capitalize">Type: {preview.type}</span>
                {preview.severity ? (
                  <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] md:text-xs text-[#A3A3A3] capitalize">Severity: {preview.severity}</span>
                ) : null}
                <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] md:text-xs text-[#A3A3A3] capitalize">Status: {STATUS_TO_TEXT[preview.status]}</span>
                {preview.reportedBy ? (
                  <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] md:text-xs text-[#A3A3A3]">By: {preview.reportedBy}</span>
                ) : null}
                <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] md:text-xs text-[#A3A3A3]">{new Date(preview.createdAt).toLocaleString()}</span>
              </div>
              {preview.description ? (
                <p className="text-sm text-[#A3A3A3] whitespace-pre-wrap">{preview.description}</p>
              ) : null}
              {preview.link ? (
                <a href={preview.link} className="text-sm text-[#FFCA33] hover:underline">Open related page</a>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 md:px-5 md:py-4 border-t border-[#1f1f1f]">
              <button
                onClick={() => setPreview(null)}
                className="text-sm rounded-md border border-[#1f1f1f] px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Close
              </button>
              <a
                href="/admin/moderation"
                className="text-sm rounded-md border border-[#1f1f1f] px-3 py-2 text-[#000CF5] hover:bg-white/5 flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Go to Moderation Center
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


