"use client";

import { useEffect, useMemo, useState } from "react";

type ModerationRow = {
  id: string;
  type: "bug" | "report" | "appeal" | "system";
  title: string;
  description?: string;
  severity?: "low" | "medium" | "high" | "critical";
  reported_by?: string;
  status: "open" | "in_review" | "resolved" | "closed";
  link?: string;
  created_at: string;
};

const STATUS: ModerationRow["status"][] = ["open", "in_review", "resolved", "closed"];
const SEVERITIES: NonNullable<ModerationRow["severity"]>[] = ["low", "medium", "high", "critical"];

export function ModerationTable({ onStatsChange }: { onStatsChange?: () => void }) {
  const [rows, setRows] = useState<ModerationRow[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isSample, setIsSample] = useState<boolean>(false);
  const [preview, setPreview] = useState<ModerationRow | null>(null);

  const fallback: ModerationRow[] = useMemo(
    () => [
      {
        id: "m1",
        type: "bug",
        title: "Chart labels overflow on small screens",
        description: "x-axis labels overlap on devices < 360px width",
        severity: "medium",
        reported_by: "QA Bot",
        status: "open",
        link: "/admin/analytics",
        created_at: new Date().toISOString(),
      },
      {
        id: "m2",
        type: "report",
        title: "Player reported for spam messaging",
        description: "User @fastShooter sent 40+ unsolicited messages in 10m",
        severity: "high",
        reported_by: "@fan_482",
        status: "in_review",
        link: "/admin/users",
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: "m3",
        type: "system",
        title: "Ads metrics delayed",
        description: "ETL job ran late; check cron schedule",
        severity: "low",
        reported_by: "System",
        status: "open",
        link: "/admin/analytics",
        created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const qs = new URLSearchParams();
        if (statusFilter) qs.set("status", statusFilter);
        if (typeFilter) qs.set("type", typeFilter);
        qs.set("limit", "100");
        const res = await fetch(`/api/admin/moderations?${qs.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          setRows(fallback);
          setIsSample(true);
          return;
        }
        const data = (await res.json()) as ModerationRow[];
        if (!data || data.length === 0) {
          setRows(fallback);
          setIsSample(true);
          return;
        }
        if (cancelled) return;
        setRows(data);
        setIsSample(false);
      } catch (e) {
        if (!cancelled) {
          setRows(fallback);
          setIsSample(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, typeFilter]);

  const filtered = useMemo(() => {
    const base = rows ?? [];
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((r) =>
      [r.title, r.description, r.reported_by, r.type, r.status, r.severity, r.link]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, query]);

  async function updateRow(id: string, changes: Partial<Pick<ModerationRow, "status" | "severity" | "title" | "description" | "link">>) {
    const prev = rows ?? [];
    setRows((r) => (r ? r.map((x) => (x.id === id ? { ...x, ...changes } : x)) : r));
    try {
      const res = await fetch(`/api/admin/moderations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) throw new Error("update failed");
      
      // Refresh stats after successful update
      if (onStatsChange) {
        onStatsChange();
      }
    } catch (e) {
      // revert on failure
      setRows(prev);
    }
  }

  async function deleteRow(id: string) {
    const prev = rows ?? [];
    setRows((r) => (r ? r.filter((x) => x.id !== id) : r));
    try {
      const res = await fetch(`/api/admin/moderations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      
      // Refresh stats after successful delete
      if (onStatsChange) {
        onStatsChange();
      }
    } catch (e) {
      setRows(prev);
    }
  }

  return (
    <div className="rounded-xl border border-[#1f1f1f] bg-[#0b0b0b]/60 backdrop-blur-sm overflow-hidden">
      <div className="p-3 md:p-5 border-b border-[#1f1f1f] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <h2 className="text-base md:text-xl font-semibold text-white truncate">Moderation Center</h2>
          {isSample ? (
            <span className="inline-flex items-center rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] md:text-xs text-[#A3A3A3] whitespace-nowrap">Using sample data</span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="bg-transparent border border-[#1f1f1f] rounded-md px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-white placeholder-[#858585] focus:outline-none focus:ring-1 focus:ring-[#000CF5] min-w-0 flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border border-[#1f1f1f] rounded-md px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-white focus:outline-none min-w-0"
          >
            <option value="">All Statuses</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent border border-[#1f1f1f] rounded-md px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-white focus:outline-none min-w-0"
          >
            <option value="">All Types</option>
            {(["bug","report","appeal","system"] as const).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="bg-white/5 text-[#A3A3A3]">
            <tr>
              <th className="text-left px-2 md:px-4 py-2 md:py-3 min-w-[200px]">Title</th>
              <th className="text-left px-2 md:px-4 py-2 md:py-3 hidden sm:table-cell">Type</th>
              <th className="text-left px-2 md:px-4 py-2 md:py-3 hidden md:table-cell">Severity</th>
              <th className="text-left px-2 md:px-4 py-2 md:py-3">Status</th>
              <th className="text-left px-2 md:px-4 py-2 md:py-3 hidden lg:table-cell">Reported By</th>
              <th className="text-left px-2 md:px-4 py-2 md:py-3 hidden md:table-cell">Created</th>
              <th className="text-left px-2 md:px-4 py-2 md:py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f1f1f]">
            {(filtered ?? []).map((r) => (
              <tr key={r.id} className="hover:bg-white/5">
                <td className="px-2 md:px-4 py-2 md:py-3 text-white min-w-[200px]">
                  <div className="font-medium truncate text-xs md:text-sm">{r.title}</div>
                  {r.description ? (
                    <div className="text-[10px] md:text-xs text-[#A3A3A3] line-clamp-1 md:line-clamp-2">{r.description}</div>
                  ) : null}
                  <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                    <span className="text-[10px] text-[#A3A3A3] capitalize">{r.type}</span>
                    {r.severity && <span className="text-[10px] text-[#A3A3A3]">• {r.severity}</span>}
                  </div>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-white capitalize hidden sm:table-cell text-xs md:text-sm">{r.type}</td>
                <td className="px-2 md:px-4 py-2 md:py-3 hidden md:table-cell">
                  <select
                    value={r.severity || "low"}
                    onChange={(e) => updateRow(r.id, { severity: e.target.value as ModerationRow["severity"] })}
                    className="bg-transparent border border-[#1f1f1f] rounded-md px-1 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs text-white"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3">
                  <select
                    value={r.status}
                    onChange={(e) => updateRow(r.id, { status: e.target.value as ModerationRow["status"] })}
                    className="bg-transparent border border-[#1f1f1f] rounded-md px-1 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs text-white"
                  >
                    {STATUS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-[#A3A3A3] hidden lg:table-cell text-xs md:text-sm">{r.reported_by || "-"}</td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-[#A3A3A3] hidden md:table-cell text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-2 md:px-4 py-2 md:py-3">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <button
                      onClick={() => setPreview(r)}
                      title="View"
                      className="inline-flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded hover:bg-white/10"
                      aria-label="View details"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3 md:h-4 md:w-4 text-[#FFCA33]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => updateRow(r.id, { status: "resolved" })}
                      title="Resolve"
                      className="inline-flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded hover:bg-white/10"
                      aria-label="Mark resolved"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3 md:h-4 md:w-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteRow(r.id)}
                      title="Delete"
                      className="inline-flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded hover:bg-white/10"
                      aria-label="Delete"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3 md:h-4 md:w-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(!loading && (filtered ?? []).length === 0) ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[#A3A3A3]">No items</td>
              </tr>
            ) : null}
          </tbody>
        </table>
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
                <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] md:text-xs text-[#A3A3A3] capitalize">Status: {preview.status}</span>
                {preview.reported_by ? (
                  <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] md:text-xs text-[#A3A3A3]">By: {preview.reported_by}</span>
                ) : null}
                <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] md:text-xs text-[#A3A3A3]">{new Date(preview.created_at).toLocaleString()}</span>
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
              {preview.status !== "resolved" ? (
                <button
                  onClick={() => { updateRow(preview.id, { status: "resolved" }); setPreview(null); }}
                  className="text-sm rounded-md border border-[#1f1f1f] px-3 py-2 text-green-500 hover:bg-white/5 flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Mark Resolved
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


