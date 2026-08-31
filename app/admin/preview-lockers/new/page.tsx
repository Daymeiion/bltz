import { previewAdmin } from "@/lib/preview-lockers/server";
import PreviewLockerForm from "../PreviewLockerForm";
export const dynamic = "force-dynamic";
export default async function NewPreview() {
  await previewAdmin();
  return <section className="mx-auto max-w-4xl space-y-6 p-6 sm:p-10"><h1 className="text-3xl font-semibold">Create private preview</h1><PreviewLockerForm /></section>;
}
