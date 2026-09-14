import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { previewAccess, PreviewError } from "@/lib/preview-lockers/server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private BLTZ preview", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };
export default async function PrivatePreviewLayout({ children }: { children: React.ReactNode }) {
  try { await previewAccess(); } catch (error) { if (error instanceof PreviewError && error.status === 401) notFound(); throw error; }
  return <>{children}</>;
}
