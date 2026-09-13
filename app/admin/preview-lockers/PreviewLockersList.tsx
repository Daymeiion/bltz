"use client";

import Link from "next/link";
import * as React from "react";

export type PreviewLockerListItem = {
  id: string;
  slug: string;
  full_name: string;
  position: string | null;
  level: string | null;
  school: string | null;
  headshot_url: string | null;
  created_at: string;
};

const LEVEL_LABEL: Record<string, string> = {
  hs: "High school",
  college: "College",
  pro: "Pro",
  former: "Former pro",
};

export function PreviewLockersList({ items }: { items: PreviewLockerListItem[] }) {
  const [rows, setRows] = React.useState(items);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete the preview locker for "${name}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/preview-lockers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch {
      window.alert("Couldn't delete that preview locker. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        No preview lockers yet. Click "New Preview" to scrape your first demo player.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-100 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Level / School</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="flex items-center gap-3 px-4 py-3">
                <img
                  src={row.headshot_url || "/images/Headshot.png"}
                  alt=""
                  className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-neutral-950 dark:text-white">{row.full_name}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {row.position || "—"}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                {row.level ? LEVEL_LABEL[row.level] ?? row.level : "—"}
                {row.school ? ` · ${row.school}` : ""}
              </td>
              <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                {new Date(row.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                  <Link
                    href={`/preview-lockers/${row.slug}`}
                    target="_blank"
                    className="text-[#c78a00] hover:underline dark:text-[#ffbb00]"
                  >
                    View
                  </Link>
                  <Link
                    href={`/admin/preview-lockers/${row.id}/edit`}
                    className="text-neutral-600 hover:underline dark:text-neutral-300"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(row.id, row.full_name)}
                    disabled={deletingId === row.id}
                    className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    {deletingId === row.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
