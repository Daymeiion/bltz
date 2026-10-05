import { createClient } from "@/lib/supabase/server";
import { VideoCard } from "@/components/ui/VideoCard";
import { GridSkeleton } from "@/components/ui/GridSkeleton";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('videos')
    .select('id,title,thumbnail_url,created_at')
    .eq('visibility','public')
    .order('created_at',{ ascending: false })
    .limit(24);

  if (error) return <div className="p-6 text-red-400">Error loading feed.</div>;
  if (!data) return <GridSkeleton />;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((v: { id: string; title: string; thumbnail_url: string | null }) => <VideoCard key={v.id} id={v.id} title={v.title} thumbnail_url={v.thumbnail_url ?? undefined} />)}
    </main>
  );
}
