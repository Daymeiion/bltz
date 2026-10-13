import { notFound } from "next/navigation";
import { readPreviewPendingState } from "@/lib/preview-lockers/server";
import PreviewAccessStartGate from "./PreviewAccessStartGate";

export async function previewPendingOrNotFound(slug: string) {
  const pending = await readPreviewPendingState(slug);
  if (!pending) notFound();
  return <PreviewAccessStartGate previewId={pending.previewId} />;
}
