import Link from "next/link";

export function connectedCareerId(previewPlayerId?: string | null, verifiedPlayerId?: string | null) {
  if (previewPlayerId && verifiedPlayerId && previewPlayerId !== verifiedPlayerId) return null;
  return previewPlayerId || verifiedPlayerId || null;
}

export function GtmPlayerConnections({ gsisId, preview, verifiedPlayerId }: {
  gsisId?: string | null;
  preview?: { id: string; player_id?: string | null } | null;
  verifiedPlayerId?: string | null;
}) {
  const playerId = connectedCareerId(preview?.player_id, verifiedPlayerId);
  const link = "inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-[#ffbb00]";
  return <div className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Player connections">
    {gsisId && <Link className={link} href={`/admin/gtm/players?gsis=${encodeURIComponent(gsisId)}`}>Player Master record</Link>}
    {preview && <>
      <Link className={link} href={`/admin/preview-lockers/${preview.id}/edit`}>Manage preview</Link>
      <Link className={link} href={`/admin/gtm/funnel?activity_preview=${preview.id}#preview-activity`}>Activity and invitations</Link>
    </>}
    {playerId ? <Link className={link} href={`/admin/intelligence?athlete=${playerId}`}>Open in Intelligence Lab</Link>
      : preview ? <Link className={link} href={`/admin/preview-lockers/${preview.id}/edit?identity=review#preview-sportradar-panel`}>Review Career ID connection</Link>
        : <span className="py-3 text-xs text-neutral-500">Create a preview to review its Career ID connection.</span>}
  </div>;
}
