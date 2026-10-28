import { previewPendingOrNotFound } from "@/components/preview-lockers/preview-pending";
import { readPrivatePreview } from "@/lib/preview-lockers/server";
import PrototypeBanner from "@/components/preview-lockers/PrototypeBanner";

// Every preview page and nested room passes this exact-slug authorization.
// readPrivatePreview permits a current assigned viewer, an internal admin,
// or a preview whose own short link has explicitly enabled link access.
export default async function PreviewLockerAccessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!await readPrivatePreview(slug)) return previewPendingOrNotFound(slug);
  return <><PrototypeBanner />{children}</>;
}
