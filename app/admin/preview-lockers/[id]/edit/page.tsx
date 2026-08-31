import { notFound } from "next/navigation";
import { z } from "zod";
import { previewAdmin, PREVIEW_COLUMNS, PreviewError } from "@/lib/preview-lockers/server";
import { previewRecord } from "@/lib/preview-lockers/validation";
import PreviewLockerForm from "../../PreviewLockerForm";
export const dynamic = "force-dynamic";
export default async function EditPreview({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await previewAdmin(); const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { data, error } = await client.from("preview_lockers").select(PREVIEW_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new PreviewError("preview_unavailable", 503);
  if (!data) notFound();
  return <section className="mx-auto max-w-4xl space-y-6 p-6 sm:p-10"><h1 className="text-3xl font-semibold">Edit private preview</h1><PreviewLockerForm record={previewRecord.parse(data)} /></section>;
}
