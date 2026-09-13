import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { previewAccess, PreviewError } from "@/lib/preview-lockers/server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private BLTZ preview", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };
export default async function PrivatePreviewLayout({ children }: { children: React.ReactNode }) {
  let isAdmin = false;
  try { isAdmin = (await previewAccess()).isAdmin; } catch (error) { if (error instanceof PreviewError && error.status === 401) notFound(); throw error; }
  return <><nav className="flex flex-wrap items-center gap-4 border-b border-white/20 bg-black px-6 py-3 text-sm text-white" aria-label="Private demo"><strong>PRIVATE DEMO · RIGHTS UNVERIFIED</strong><span>Private access does not grant copyright or reuse rights.</span>{isAdmin && <Link className="underline" href="/admin/preview-lockers">Saved previews</Link>}</nav>{children}</>;
}
