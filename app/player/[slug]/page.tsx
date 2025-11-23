import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlayerProfileCard from "@/app/player/PlayerProfileCard";
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

const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "1";

export default async function PlayerLocker({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  
  // -------- MOCK PATH --------
  if (useMock) {
    const player = MOCK_PLAYERS.find((p: any) => p.slug === resolvedParams.slug) ?? MOCK_PLAYERS[0];
    const vids = MOCK_VIDEOS;
    const media = MOCK_MEDIA;

    // Derive dynamic bio/stat fields from mock meta (with sensible fallbacks)
    const mockMeta = (player as any).meta ?? {};
    const dob = mockMeta.dob ?? "1985-08-07"; // YYYY-MM-DD
    const heightIn = mockMeta.height_in ?? 71; // inches
    const weightLbs = mockMeta.weight_lbs ?? 210;
    const gamesPlayed = mockMeta.games_played ?? 116;

    const age = (() => {
      const d = new Date(dob);
      if (isNaN(d.getTime())) return undefined;
      const now = new Date();
      let a = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
      return a;
    })();

    const dobDisplay = (() => {
      const d = new Date(dob);
      if (isNaN(d.getTime())) return "—";
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${mm}-${dd}-${yyyy}`;
    })();

    const feet = Math.floor((heightIn ?? 0) / 12);
    const inches = (heightIn ?? 0) % 12;

    return (
      <main className="mx-auto max-w-6xl p-6 relative scrollbar-hide">
        {/* Background with frosted gray and gradient accent (full-screen) */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gray-900/30 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#FFBB00]/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 grid grid-cols-1 gap-1 lg:grid-cols-4 lg:gap-12">
          {/* 1/4 column */}
          <aside className="space-y-2 lg:col-span-1 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto scrollbar-hide">
            <PlayerHeader
              fullName={(player as any).full_name || (player as any).name || "Unknown Player"}
              city="Los Angeles, CA"
              videoSrc="/videos/demo-reel.mp4"
              videoPoster="/images/video-thumb.png"
              badgeUrl="/images/SilverHero1.png"
              avatarUrl="/images/Headshot.png"
            />
          </aside>

          {/* 3/4 column */}
          <section className="lg:col-span-3 scrollbar-hide">
            {/* Desktop view - original layout */}
            <div className="hidden lg:block space-y-6">
              {/* Image container above bio */}
              <div className="relative h-48 w-full rounded-t-md overflow-hidden">
                  <Image 
                    src="/images/media-5.jpg" 
                    alt="Player highlight" 
                    fill 
                    className="object-cover" 
                  />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90" />
                <PlayerActionButtons playerName={player.full_name || "DEMO PLAYER"} />
              </div>

              {/* Bio (desktop only, placed above Videos) */}
              <div className="space-y-0 -mt-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bebas tracking-widest">Bio</h2>
                </div>
                <div className="rounded-md border border-white/5 bg-white/5 p-2 h-[150px] max-h-[150px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div className="grid grid-cols-[1fr_1fr_2fr] gap-1 h-full">
                    {/* Column 1: profile image */}
                    <div className="rounded-md bg-black/20 border border-white/10 p-2 flex items-center justify-center overflow-hidden">
                      <div className="relative w-full aspect-square max-w-[140px]">
                        <Image src="/images/Headshot.png" alt="Profile" fill className="object-cover rounded-md" />
                      </div>
                    </div>

                    {/* Column 2: stats grid */}
                      <div className="flex flex-col gap-1 h-full justify-between">
                       <div className="rounded-md bg-black/20 border border-white/10 p-1 text-white/90 text-center flex items-center justify-center h-full">
                         <div className="text-[8px] opacity-80 inline mr-1 font-oswald">DOB: </div>
                         <div className="text-md font-bebas tracking-wider inline">{dobDisplay}{typeof age === "number" && <span className="opacity-70 text-[10px] ml-1 font-oswald tracking-wider align-baseline">(age {age})</span>}</div>
                        </div>
                       <div className="grid grid-cols-2 gap-1">
                         <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                           <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Height</div>
                           <div className="text-sm font-bold font-bebas tracking-wider">{feet}'{inches}</div>
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

                    {/* Column 3: biography with read more */}
                    <div className="flex flex-col h-full">
                      <div className="flex-1 rounded-md p-2 text-white/90 leading-relaxed overflow-hidden">
                        <p className="text-xxs md:text-xs">
                          This is a short biography about the player. It highlights background, strengths,
                          achievements, and playing style. Replace this placeholder with the player's locker
                          biography pulled from Supabase.
                        </p>
                      </div>
                      <div className="mt-2 flex justify-end">
                          <BioModal 
                            bioText={`Daymeion Dante Hughes (born August 21, 1985) is an American former professional football player who was a cornerback for five seasons in the National Football League (NFL). He played college football for the California Golden Bears, earning consensus All-American honors in 2006. The Indianapolis Colts selected him in the third round of the 2007 NFL draft, and he also played for the NFL's San Diego Chargers.

Early Life
Hughes was born in Los Angeles, California. Tested for Highly Gifted at age 8. Attended Park Western Place Elementary gifted and talented, which is located in San Pedro, California. Went on to attend Crenshaw High School in Los Angeles, and was a letterman in football, basketball, tennis, and track. In football, he was an all-league and an all-city honoree as a junior. As a senior, he was named the Coliseum League's co-Player of the Year. In basketball, he was a two-year starter. On Rivals.com's list of Top 100 California Players, Hughes came in at No. 41 and was subsequently recruited by multiple Pac-10 and Big Ten programs, but eventually landed at Cal.

College Career
Hughes enrolled at the University of California, Berkeley, where he played for California Golden Bears football team from 2003 to 2006. He was recognized as the Lott Trophy winner in 2006 and a consensus first-team All-American while leading the nation in interceptions with eight. He was prolific in breaking up passes and making pinpoint tackles to stop the passer's progress in all four years. Due to his ability to completely shut down one side of the field, he was given the label of a "shutdown corner," a title only given to the best of defensive backs.

Professional Career
After his senior season, he was expected to be an early first day pick in the 2007 NFL draft and one of the first cornerbacks taken. However, slower than expected 40-yard dash times likely led to his selection by the Indianapolis Colts late the third round. Hughes and Tim Jennings competed for the nickel back duties behind projected starter Kelvin Hayden and left corner Marlin Jackson. Hughes finished the season with 14 tackles in only 10 games.

Personal
He is known by his middle name, Dante, to his close friends and family members. He is the son of Ronald and Catana Hughes and graduated with a degree in art practice. Hughes and his art were featured on the sports page of the San Jose Mercury News.`}
                            playerName="Daymeion Dante Hughes"
                            playerLevel="Professional"
                            playerStatus="former"
                          />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Videos */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bebas tracking-widest">Videos</h2>
                  <VideoGridModal playerName={player.full_name} />
                </div>
                <VideoYTRow videos={MOCK_VIDEOS_YT} />
              </div>

              {/* Media */}
              <div className="space-y-3">
                {(() => {
                  const mediaItems = [
                    { id: "1", url: "/images/media-5.jpg", title: "Game Highlight 1", credits: "Photo by John Smith", width: 1600, height: 900 },
                    { id: "2", url: "/images/media-6.jpg", title: "Game Highlight 2", credits: "Photo by Jane Doe", width: 800, height: 1200 },
                    { id: "3", url: "/images/media-1.png", title: "Action Shot", credits: "Photo by Sports Weekly", width: 1200, height: 800 },
                    { id: "4", url: "/images/SilverHero1.png", title: "Team Photo", credits: "Official Team Photo", width: 900, height: 1200 },
                    { id: "5", url: "/images/media-3.png", title: "Championship", credits: "Photo by League Photographer", width: 1200, height: 900 },
                    { id: "6", url: "/images/Headshot.png", title: "Portrait", credits: "Official Headshot", width: 800, height: 1000 },
                    { id: "7", url: "/images/media-2.png", title: "Training Day", credits: "Photo by Team Media", width: 1600, height: 900 },
                    { id: "8", url: "/images/media-5.jpg", title: "Game Highlight 3", credits: "Photo by Team Photographer", width: 800, height: 1200 },
                  ];

                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bebas tracking-widest">Media</h2>
                        <MediaMasonryModal mediaItems={mediaItems}>
                          <button className="text-[#FFBB00] hover:text-[#FFBB00]/80 text-sm underline px-4 uppercase cursor-pointer">
                            SEE ALL
                          </button>
                        </MediaMasonryModal>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {/* First row: 2/3 and 1/3 */}
                        <MediaCarouselModal mediaItems={mediaItems} initialIndex={0}>
                          <WobbleCard containerClassName="h-48 col-span-2 rounded-md bg-transparent cursor-pointer" className="p-0">
                            <div className="relative rounded-md overflow-hidden w-full h-full">
                              <Image src="/images/media-5.jpg" alt="Media 1" fill className="object-cover" />
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                            </div>
                          </WobbleCard>
                        </MediaCarouselModal>
                        
                        <MediaCarouselModal mediaItems={mediaItems} initialIndex={1}>
                          <WobbleCard containerClassName="h-48 col-span-1 rounded-md bg-transparent cursor-pointer" className="p-0">
                            <div className="relative rounded-md overflow-hidden w-full h-full">
                              <Image src="/images/media-6.jpg" alt="Media 2" fill className="object-cover" />
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                            </div>
                          </WobbleCard>
                        </MediaCarouselModal>
                        
                        {/* Second row: 1/3 and 2/3 */}
                        <MediaCarouselModal mediaItems={mediaItems} initialIndex={2}>
                          <WobbleCard containerClassName="h-48 col-span-1 rounded-md bg-transparent cursor-pointer" className="p-0">
                            <div className="relative rounded-md overflow-hidden w-full h-full">
                              <Image src="/images/media-5.jpg" alt="Media 3" fill className="object-cover" />
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                            </div>
                          </WobbleCard>
                        </MediaCarouselModal>
                        
                        <MediaCarouselModal mediaItems={mediaItems} initialIndex={3}>
                          <WobbleCard containerClassName="h-48 col-span-2 rounded-md bg-transparent cursor-pointer" className="p-0">
                            <div className="relative rounded-md overflow-hidden w-full h-full">
                              <Image src="/images/SilverHero1.png" alt="Card Image" fill className="object-cover" />
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                            </div>
                          </WobbleCard>
                        </MediaCarouselModal>
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>

            {/* Mobile view - tabs */}
            <div className="lg:hidden">
              <MobileTabs playerName={player.full_name || "DEMO PLAYER"} />
            </div>
          </section>
        </div>
      </main>
    );
  }

  // -------- LIVE (SUPABASE) PATH --------
  const supabase = await createClient();
  
  // Debug: Verify Supabase connection
  console.log('[Player Page] Supabase client created, checking connection...');
  console.log('[Player Page] Resolved slug:', resolvedParams.slug);

  // Fetch player by slug with visibility filter (required by RLS policy)
  console.log('[Player Page] Fetching player with slug:', resolvedParams.slug);
  
  // Only select columns that actually exist in the players table
  // Available columns: id, full_name, name, profile_image, slug, visibility, hometown, video_url
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, full_name, name, profile_image, hometown, video_url")
    .eq("slug", resolvedParams.slug)
    .eq("visibility", true)
    .maybeSingle();
  
  // Log the raw response for debugging
  if (playerError) {
    console.error('[Player Page] Supabase query error:', {
      message: playerError.message,
      code: playerError.code,
      details: playerError.details,
      hint: playerError.hint
    });
  } else {
    console.log('[Player Page] Query successful:', {
      hasPlayer: !!player,
      playerId: player?.id,
      playerName: (player as any)?.full_name
    });
  }

  // Debug: Log query results
  console.log('[Player Page] Query result:', {
    slug: resolvedParams.slug,
    hasPlayer: !!player,
    playerId: player?.id,
    playerFullName: (player as any)?.full_name,
    hasError: !!playerError,
    errorKeys: playerError ? Object.keys(playerError) : []
  });

  // Only treat as error if it has actual error properties (message or code)
  // Empty objects {} are not real errors
  if (playerError && ((playerError as any).message || (playerError as any).code)) {
    console.error('[Player Page] Real Supabase error:', {
      message: (playerError as any).message,
      code: (playerError as any).code,
      details: (playerError as any).details,
      hint: (playerError as any).hint
    });
    return notFound();
  }
  
  // If we have an error object but no message/code, it's likely an empty object - ignore it
  if (playerError && !(playerError as any).message && !(playerError as any).code) {
    console.log('[Player Page] Ignoring empty error object, checking if player exists...');
  }

  // If no player found, return 404
  // Note: We only return 404 if player is actually null/undefined, not if there's an empty error object
  if (!player) {
    console.error('[Player Page] Player not found for slug:', resolvedParams.slug);
    console.log('[Player Page] Checking available slugs in database...');
    // Try to get a list of available slugs for debugging
    const { data: slugs } = await supabase
      .from("players")
      .select("slug")
      .eq("visibility", true)
      .limit(10);
    console.log('[Player Page] Sample available slugs:', slugs?.map((p: any) => p.slug));
    return notFound();
  }
  
  // Success - player found!
  console.log('[Player Page] ✅ Player found successfully:', {
    id: player.id,
    slug: resolvedParams.slug,
    full_name: (player as any).full_name
  });

  // Use full_name column from database (this is the correct column name)
  // Access it properly since TypeScript might not recognize it
  const playerFullName = (player as any).full_name || (player as any).name || null;
  
  // Debug: Log player data to verify we're getting the right column
  console.log('[Player Page] LIVE PATH - Player data:', {
    id: player.id,
    slug: resolvedParams.slug,
    'player.full_name (raw)': (player as any).full_name,
    'player.name (raw)': (player as any).name,
    playerFullName: playerFullName,
    'typeof full_name': typeof (player as any).full_name,
    'useMock': useMock
  });

  // Locker (bio, colors, etc.)
  const { data: locker } = await supabase
    .from("player_lockers")
    .select("headline, bio, colors")
    .eq("player_id", player.id)
    .single();

  // Note: meta column doesn't exist in players table
  // Use placeholder values when data is not available
  const dobLive: string | undefined = "1990-01-15"; // Placeholder DOB: January 15, 1990
  const heightInLive: number | undefined = 72; // Placeholder height: 6'0" (72 inches)
  const weightLbsLive: number | undefined = 220; // Placeholder weight: 220 lbs
  const gamesPlayedLive: number | undefined = 50; // Placeholder games played

  const ageLive = (() => {
    if (!dobLive) return undefined;
    const d = new Date(dobLive);
    if (isNaN(d.getTime())) return undefined;
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a;
  })();

  const dobDisplayLive = (() => {
    if (!dobLive) return "—";
    const d = new Date(dobLive);
    if (isNaN(d.getTime())) return "—";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  })();

  const feetLive = Math.floor((heightInLive ?? 0) / 12);
  const inchesLive = (heightInLive ?? 0) % 12;

  // Videos
  const { data: vids } = await supabase
    .from("videos")
    .select("id,title,thumbnail_url")
    .eq("player_id", player.id)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(12);

  // Media - use mock media as placeholder
  // In the future, this can be fetched from a media table
  const media: { id: string; title: string; url: string }[] = MOCK_MEDIA.length > 0
    ? MOCK_MEDIA
    : [];

  // Derive city from hometown column (city column doesn't exist)
  const city = (player as any).hometown || undefined;

  // Use demo-reel.mp4 for all player pages
  const videoSrc = "/videos/demo-reel.mp4";
  const videoPoster = (player as any).profile_image || "/images/video-thumb.png";

  return (
    <main className="mx-auto max-w-6xl p-2 scrollbar-hide">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:gap-12">
        {/* 1/4 column */}
        <aside className="space-y-2 lg:col-span-1 lg:sticky lg:top-2 lg:h-[calc(100vh-1rem)] lg:overflow-y-auto scrollbar-hide">
            <PlayerHeader
              fullName={playerFullName || "Unknown Player"}
              city={city || "Hometown, USA"}
              videoSrc={videoSrc}
              videoPoster={videoPoster}
              badgeUrl="/images/SilverHero1.png"
              avatarUrl={player.profile_image || "/images/Headshot.png"}
            />
        </aside>

        {/* 3/4 column */}
        <section className="space-y-2 lg:col-span-3 scrollbar-hide">
          {/* Image container above bio */}
          <div className="relative h-48 w-full rounded-t-md overflow-hidden hidden lg:block">
            <Image 
              src="/images/media-5.jpg" 
              alt="Player highlight" 
              fill 
              className="object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
            <PlayerActionButtons 
              playerName={player.full_name}
              playerImage={player.profile_image || "/images/Headshot.png"}
              playerBadge="/images/SilverHero1.png"
            />
          </div>

          {/* Bio (desktop only, placed above Videos) */}
          <div className="space-y-0 hidden lg:block -mt-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bebas tracking-widest">Bio</h2>
            </div>
            <div className="rounded-md border border-white/5 bg-white/5 p-2 h-[150px] max-h-[150px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="grid grid-cols-[1fr_1fr_2fr] gap-1 h-full">
                {/* Column 1: profile image */}
                <div className="rounded-md bg-black/20 border border-white/10 p-2 flex items-center justify-center overflow-hidden">
                  <div className="relative w-full aspect-square max-w-[140px]">
                    <Image src="/images/Headshot.png" alt="Profile" fill className="object-cover rounded-md" />
                  </div>
                </div>

                {/* Column 2: stats grid */}
                <div className="flex flex-col gap-1 h-full justify-between">
                  <div className="rounded-md bg-black/20 border border-white/10 p-1 text-white/90 text-center flex items-center justify-center h-full">
                    <div className="text-[8px] opacity-80 inline mr-1 font-oswald">DOB: </div>
                    <div className="text-md font-bebas tracking-wider inline">{dobDisplayLive}{typeof ageLive === "number" && <span className="opacity-70 text-[10px] ml-1 font-oswald tracking-wider align-baseline">(age {ageLive})</span>}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Height</div>
                      <div className="text-sm font-bold font-bebas tracking-wider">{feetLive}'{inchesLive}</div>
                    </div>
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Weight</div>
                      <div className="text-sm font-bold font-bebas tracking-wider">{weightLbsLive} lbs</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Games Played</div>
                      <div className="text-base font-bold leading-[1.25rem] font-bebas tracking-wider">{gamesPlayedLive}</div>
                    </div>
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Level</div>
                      <div className="text-base font-bold leading-[1.25rem] font-bebas tracking-wider">Pro</div>
                    </div>
                  </div>
                </div>

                {/* Column 3: biography with read more */}
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-1 rounded-md p-2 text-white/90 leading-relaxed overflow-y-auto min-h-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <p className="text-xxs md:text-xs">
                      {locker?.bio ?? `${playerFullName || "This player"} is a dedicated athlete with a passion for excellence. Known for their hard work, determination, and commitment to the game, they continue to push boundaries and achieve new heights in their career. With a strong foundation and unwavering dedication, they represent the best of what it means to be a professional athlete.`}
                    </p>
                  </div>
                  <div className="mt-2 flex justify-end flex-shrink-0">
                    <BioModal 
                      bioText={locker?.bio ?? `${playerFullName || "This player"} is a dedicated athlete with a passion for excellence. Known for their hard work, determination, and commitment to the game, they continue to push boundaries and achieve new heights in their career. With a strong foundation and unwavering dedication, they represent the best of what it means to be a professional athlete.`}
                      playerName={player.full_name}
                      playerLevel={(player as any).position || "Professional"}
                      playerStatus="active"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Videos (desktop only) */}
          <div className="space-y-3 hidden lg:block">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bebas tracking-widest">Videos</h2>
              <VideoGridModal playerName={player.full_name} videos={vids} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {vids?.map((v: any) => (
                <VideoCard key={v.id} id={v.id} title={v.title} thumbnail_url={v.thumbnail_url ?? undefined} />
              ))}
            </div>
            {/* YouTube-style video row */}
            <VideoYTRow videos={MOCK_VIDEOS_YT} />
          </div>

          {/* Media (desktop only) */}
          <div className="space-y-3 hidden lg:block">
            {(() => {
              // Use mock media items as placeholder
              const mediaItems = [
                { id: "1", url: "/images/media-5.jpg", title: "Game Highlight 1", credits: "Photo by John Smith", width: 1600, height: 900 },
                { id: "2", url: "/images/media-6.jpg", title: "Game Highlight 2", credits: "Photo by Jane Doe", width: 800, height: 1200 },
                { id: "3", url: "/images/media-1.png", title: "Action Shot", credits: "Photo by Sports Weekly", width: 1200, height: 800 },
                { id: "4", url: "/images/SilverHero1.png", title: "Team Photo", credits: "Official Team Photo", width: 900, height: 1200 },
                { id: "5", url: "/images/media-3.png", title: "Championship", credits: "Photo by League Photographer", width: 1200, height: 900 },
                { id: "6", url: "/images/Headshot.png", title: "Portrait", credits: "Official Headshot", width: 800, height: 1000 },
                { id: "7", url: "/images/media-2.png", title: "Training Day", credits: "Photo by Team Media", width: 1600, height: 900 },
                { id: "8", url: "/images/media-5.jpg", title: "Game Highlight 3", credits: "Photo by Team Photographer", width: 800, height: 1200 },
              ];

              return (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bebas tracking-widest">Media</h2>
                    <MediaMasonryModal mediaItems={mediaItems}>
                      <button className="text-[#FFBB00] hover:text-[#FFBB00]/80 text-sm underline px-4 uppercase cursor-pointer">
                        SEE ALL
                      </button>
                    </MediaMasonryModal>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {/* First row: 2/3 and 1/3 */}
                    <MediaCarouselModal mediaItems={mediaItems} initialIndex={0}>
                      <WobbleCard containerClassName="h-48 col-span-2 rounded-md bg-transparent cursor-pointer" className="p-0">
                        <div className="relative rounded-md overflow-hidden w-full h-full">
                          <Image src="/images/media-5.jpg" alt="Media 1" fill className="object-cover" />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                        </div>
                      </WobbleCard>
                    </MediaCarouselModal>
                    
                    <MediaCarouselModal mediaItems={mediaItems} initialIndex={1}>
                      <WobbleCard containerClassName="h-48 col-span-1 rounded-md bg-transparent cursor-pointer" className="p-0">
                        <div className="relative rounded-md overflow-hidden w-full h-full">
                          <Image src="/images/media-6.jpg" alt="Media 2" fill className="object-cover" />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                        </div>
                      </WobbleCard>
                    </MediaCarouselModal>
                    
                    {/* Second row: 1/3 and 2/3 */}
                    <MediaCarouselModal mediaItems={mediaItems} initialIndex={2}>
                      <WobbleCard containerClassName="h-48 col-span-1 rounded-md bg-transparent cursor-pointer" className="p-0">
                        <div className="relative rounded-md overflow-hidden w-full h-full">
                          <Image src="/images/media-5.jpg" alt="Media 3" fill className="object-cover" />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                        </div>
                      </WobbleCard>
                    </MediaCarouselModal>
                    
                    <MediaCarouselModal mediaItems={mediaItems} initialIndex={3}>
                      <WobbleCard containerClassName="h-48 col-span-2 rounded-md bg-transparent cursor-pointer" className="p-0">
                        <div className="relative rounded-md overflow-hidden w-full h-full">
                          <Image src="/images/SilverHero1.png" alt="Card Image" fill className="object-cover" />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                        </div>
                      </WobbleCard>
                    </MediaCarouselModal>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Mobile view - tabs */}
          <div className="lg:hidden">
            <MobileTabs playerName={player.full_name} />
          </div>
        </section>
      </div>
    </main>
  );
}
