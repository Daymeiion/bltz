import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditPreviewLockerForm } from "./EditPreviewLockerForm";
import { SportradarPanel } from "./SportradarPanel";

export const metadata = { title: "Edit Preview Locker | BLTZ Admin" };

export default async function EditPreviewLockerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("preview_lockers")
    .select("id, slug, full_name, bio, athlete_quote, athlete_quote_author, headshot_url, hero_video_url, videos")
    .eq("id", id)
    .maybeSingle();

  if (!data) return notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-3 md:p-8">
      <h1 className="text-2xl font-bold text-neutral-950 dark:text-white">Edit {data.full_name}</h1>
      <EditPreviewLockerForm record={data} />
      <SportradarPanel previewId={id} athleteName={data.full_name} />
    </div>
  );
}
