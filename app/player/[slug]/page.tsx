import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VideoCard } from "@/components/ui/VideoCard";
import Image from "next/image";
import { MOCK_PLAYERS, MOCK_VIDEOS, MOCK_MEDIA } from "@/lib/mock";
import VideoYTRow from "@/components/video/VideoYTRow";
import { MOCK_VIDEOS_YT } from "@/lib/mockVideosYT";
import PlayerHeader from "@/components/player/PlayerHeader";
import { WobbleCard } from "@/components/ui/wobble-card";
import PlayerActionButtons from "@/components/player/PlayerActionButtons";
import BioModal from "@/components/player/BioModal";
import VideoGridModal from "@/components/player/VideoGridModal";
import MobileTabs from "@/components/ui/MobileTabs";
import MediaCarouselModal from "@/components/player/MediaCarouselModal";
import MediaMasonryModal from "@/components/player/MediaMasonryModal";

// Mock data is only available in non-production builds. Production never returns
// mock players, regardless of how `NEXT_PUBLIC_USE_MOCK` is set.
const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "1" && process.env.NODE_ENV !== "production";

const LEVEL_LABEL: Record<string, string> = {
  hs: "High school",
  college: "College",
  pro: "Pro",
  former: "Former pro",
};

function formatDob(dob?: string | null) {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getFullYear()}`;
}

function calcAge(dob?: string | null) {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return undefined;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

export default async function PlayerLocker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // -------- MOCK PATH (dev only) --------
  if (useMock) {
    const player = MOCK_PLAYERS.find((p: any) => p.slug === slug) ?? MOCK_PLAYERS[0];
    const mockMeta = (player as any).meta ?? {};
    const dob = mockMeta.dob ?? "1985-08-07";
    const heightIn = mockMeta.height_in ?? 71;
    const weightLbs = mockMeta.weight_lbs ?? 210;
    const gamesPlayed = mockMeta.games_played ?? 116;
    const age = calcAge(dob);
    const dobDisplay = formatDob(dob);
    const feet = Math.floor((heightIn ?? 0) / 12);
    const inches = (heightIn ?? 0) % 12;

    return (
      <main className="mx-auto max-w-6xl p-6 relative scrollbar-hide">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gray-900/30 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#FFBB00]/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 grid grid-cols-1 gap-1 lg:grid-cols-4 lg:gap-12">
          <aside className="space-y-2 lg:col-span-1 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto scrollbar-hide">
            <PlayerHeader
              fullName={(player as any).full_name || (player as any).name || "Unknown Player"}
              city="Los Angeles, CA"
              videoSrc="/videos/demo-reel.mp4"
              videoPoster="/images/Awards/video-thumb.png"
              badgeUrl="/images/SilverHero1.png"
              avatarUrl="/images/Headshot.png"
            />
          </aside>
          <section className="lg:col-span-3 scrollbar-hide">
            <div className="hidden lg:block space-y-6">
              <div className="relative h-48 w-full rounded-t-md overflow-hidden">
                <Image src="/images/media-5.jpg" alt="Player highlight" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90" />
                <PlayerActionButtons playerName={(player as any).full_name || "DEMO PLAYER"} />
              </div>
              <div className="space-y-0 -mt-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bebas tracking-widest">Bio</h2>
                </div>
                <div className="rounded-md border border-white/5 bg-white/5 p-2 h-[165px] max-h-[165px] overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_2fr] gap-1 h-full">
                    <div className="rounded-md bg-black/20 border border-white/10 p-2 flex items-center justify-center overflow-hidden">
                      <div className="relative w-full aspect-square max-w-[140px]">
                        <Image src="/images/Headshot.png" alt="Profile" fill className="object-cover rounded-md" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 h-full justify-between">
                      <div className="rounded-md bg-black/20 border border-white/10 p-1 text-white/90 text-center flex items-center justify-center h-full">
                        <div className="text-[8px] opacity-80 inline mr-1 font-oswald">DOB: </div>
                        <div className="text-md font-bebas tracking-wider inline">
                          {dobDisplay}
                          {typeof age === "number" && (
                            <span className="opacity-70 text-[10px] ml-1 font-oswald tracking-wider align-baseline">
                              (age {age})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                          <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Height</div>
                          <div className="text-sm font-bold font-bebas tracking-wider">{feet}&apos;{inches}</div>
                        </div>
                        <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                          <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Weight</div>
                          <div className="text-sm font-bold font-bebas tracking-wider">{weightLbs} lbs</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                          <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Games Played</div>
                          <div className="text-base font-bold leading-[1.25rem] font-bebas tracking-wider">{gamesPlayed}</div>
                        </div>
                        <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                          <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Level</div>
                          <div className="text-base font-bold leading-[1.25rem] font-bebas tracking-wider">Pro</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col h-full">
                      <div className="flex-1 rounded-md p-2 text-white/90 leading-relaxed overflow-hidden">
                        <p className="text-xxs md:text-xs">
                          {(player as any).bio || "Mock biography goes here. Replace with Supabase locker data."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bebas tracking-widest">Videos</h2>
                  <VideoGridModal playerName={(player as any).full_name} videos={MOCK_VIDEOS} />
                </div>
                <VideoYTRow videos={MOCK_VIDEOS_YT} />
              </div>
            </div>
            <div className="lg:hidden">
              <MobileTabs playerName={(player as any).full_name || "DEMO PLAYER"} />
            </div>
          </section>
        </div>
      </main>
    );
  }

  // -------- LIVE (SUPABASE) PATH --------
  const supabase = await createClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select(
      "id, full_name, name, slug, profile_image, headshot_url, hometown, video_url, bio, position, level, dob, height_in, weight_lbs, games_played, current_status",
    )
    .eq("slug", slug)
    .eq("visibility", true)
    .maybeSingle();

  if (playerError && (playerError.message || playerError.code)) {
    return notFound();
  }
  if (!player) return notFound();

  const playerFullName = (player as any).full_name || (player as any).name || "Unknown Player";

  const { data: locker } = await supabase
    .from("player_lockers")
    .select("headline, bio, colors")
    .eq("player_id", player.id)
    .maybeSingle();

  const dob = player.dob ?? null;
  const heightIn = player.height_in ?? null;
  const weightLbs = player.weight_lbs ?? null;
  const gamesPlayed = player.games_played ?? null;
  const age = calcAge(dob);
  const dobDisplay = formatDob(dob);
  const feet = heightIn ? Math.floor(heightIn / 12) : null;
  const inches = heightIn ? heightIn % 12 : null;

  const levelLabel = player.level ? LEVEL_LABEL[player.level] ?? "—" : "—";

  // Headshot precedence: explicit headshot_url, then media kind=headshot, then
  // legacy profile_image, then default. Avatar shown in the 1/4 column header
  // and in the bio strip.
  const { data: headshotMedia } = await supabase
    .from("media")
    .select("url")
    .eq("player_id", player.id)
    .eq("kind", "headshot")
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const headshotUrl =
    player.headshot_url ||
    headshotMedia?.url ||
    (player as any).profile_image ||
    "/images/Headshot.png";

  // Videos (project-managed table, separate from media kind=video).
  const { data: vids } = await supabase
    .from("videos")
    .select("id,title,thumbnail_url")
    .eq("player_id", player.id)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(12);

  // Photos for the masonry/carousel come from `media` rows tagged photo.
  // RLS already restricts visibility to published lockers.
  const { data: photoRows } = await supabase
    .from("media")
    .select("id, url, title, credits, width, height")
    .eq("player_id", player.id)
    .eq("kind", "photo")
    .order("display_order", { ascending: true })
    .limit(20);

  const mediaItems = (photoRows ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title ?? "",
    credits: row.credits ?? "",
    width: row.width ?? 1200,
    height: row.height ?? 800,
  }));

  const heroMedia = mediaItems[0]?.url ?? "/images/media-5.jpg";
  const city = player.hometown || undefined;
  const videoSrc = (player as any).video_url || "/videos/demo-reel.mp4";
  const videoPoster = headshotUrl || "/images/Awards/video-thumb.png";

  const bioCopy =
    locker?.bio ||
    player.bio ||
    `${playerFullName} hasn't written a bio yet. Check back soon for the full story.`;

  return (
    <main className="mx-auto max-w-6xl p-2 scrollbar-hide">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:gap-12">
        {/* 1/4 column */}
        <aside className="space-y-2 lg:col-span-1 lg:sticky lg:top-2 lg:h-[calc(100vh-1rem)] lg:overflow-y-auto scrollbar-hide">
          <PlayerHeader
            fullName={playerFullName}
            city={city || "—"}
            videoSrc={videoSrc}
            videoPoster={videoPoster}
            badgeUrl="/images/SilverHero1.png"
            avatarUrl={headshotUrl}
          />
        </aside>

        {/* 3/4 column */}
        <section className="space-y-2 lg:col-span-3 scrollbar-hide">
          <div className="relative h-48 w-full rounded-t-md overflow-hidden hidden lg:block">
            <Image src={heroMedia} alt="Player highlight" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
            <PlayerActionButtons
              playerName={playerFullName}
              playerImage={headshotUrl}
              playerBadge="/images/SilverHero1.png"
            />
          </div>

          {/* Bio (desktop) */}
          <div className="space-y-0 hidden lg:block -mt-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bebas tracking-widest">Bio</h2>
            </div>
            <div className="rounded-md border border-white/5 bg-white/5 p-2 h-[150px] max-h-[150px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="grid grid-cols-[1fr_1fr_2fr] gap-1 h-full">
                <div className="rounded-md bg-black/20 border border-white/10 p-2 flex items-center justify-center overflow-hidden">
                  <div className="relative w-full aspect-square max-w-[140px]">
                    <Image src={headshotUrl} alt="Profile" fill className="object-cover rounded-md" />
                  </div>
                </div>

                <div className="flex flex-col gap-1 h-full justify-between">
                  <div className="rounded-md bg-black/20 border border-white/10 p-1 text-white/90 text-center flex items-center justify-center h-full">
                    <div className="text-[8px] opacity-80 inline mr-1 font-oswald">DOB: </div>
                    <div className="text-md font-bebas tracking-wider inline">
                      {dobDisplay}
                      {typeof age === "number" && (
                        <span className="opacity-70 text-[10px] ml-1 font-oswald tracking-wider align-baseline">
                          (age {age})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Height</div>
                      <div className="text-sm font-bold font-bebas tracking-wider">
                        {feet != null ? `${feet}'${inches}` : "—"}
                      </div>
                    </div>
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Weight</div>
                      <div className="text-sm font-bold font-bebas tracking-wider">
                        {weightLbs ? `${weightLbs} lbs` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Games Played</div>
                      <div className="text-base font-bold leading-[1.25rem] font-bebas tracking-wider">
                        {gamesPlayed ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Level</div>
                      <div className="text-base font-bold leading-[1.25rem] font-bebas tracking-wider">
                        {levelLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col h-full min-h-0">
                  <div
                    className="flex-1 rounded-md p-2 text-white/90 leading-relaxed overflow-y-auto min-h-0 scrollbar-hide"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    <p className="text-xxs md:text-xs">{bioCopy}</p>
                  </div>
                  <div className="mt-2 flex justify-end flex-shrink-0">
                    <BioModal
                      bioText={bioCopy}
                      playerName={playerFullName}
                      playerLevel={player.position || levelLabel}
                      playerStatus={player.current_status || "active"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Videos */}
          <div className="space-y-3 hidden lg:block">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bebas tracking-widest">Videos</h2>
              <VideoGridModal playerName={playerFullName} videos={vids ?? []} />
            </div>
            {vids && vids.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {vids.map((v: any) => (
                  <VideoCard key={v.id} id={v.id} title={v.title} thumbnail_url={v.thumbnail_url ?? undefined} />
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                No videos yet.
              </p>
            )}
          </div>

          {/* Media */}
          {mediaItems.length > 0 ? (
            <div className="space-y-3 hidden lg:block">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bebas tracking-widest">Media</h2>
                <MediaMasonryModal mediaItems={mediaItems}>
                  <button className="text-[#FFBB00] hover:text-[#FFBB00]/80 text-sm underline px-4 uppercase cursor-pointer">
                    SEE ALL
                  </button>
                </MediaMasonryModal>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {mediaItems.slice(0, 4).map((item, i) => (
                  <MediaCarouselModal key={item.id} mediaItems={mediaItems} initialIndex={i}>
                    <WobbleCard
                      containerClassName={`h-48 ${i % 3 === 0 ? "col-span-2" : "col-span-1"} rounded-md bg-transparent cursor-pointer`}
                      className="p-0"
                    >
                      <div className="relative rounded-md overflow-hidden w-full h-full">
                        <Image src={item.url} alt={item.title || "Media"} fill className="object-cover" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                      </div>
                    </WobbleCard>
                  </MediaCarouselModal>
                ))}
              </div>
            </div>
          ) : null}

          {/* Mobile view */}
          <div className="lg:hidden">
            <MobileTabs playerName={playerFullName} />
          </div>
        </section>
      </div>
    </main>
  );
}
