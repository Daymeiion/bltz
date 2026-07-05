import Image from "next/image";
import { VideoCard } from "@/components/ui/VideoCard";
import PlayerHeader from "@/components/player/PlayerHeader";
import { WobbleCard } from "@/components/ui/wobble-card";
import PlayerActionButtons from "@/components/player/PlayerActionButtons";
import BioModal from "@/components/player/BioModal";
import VideoGridModal from "@/components/player/VideoGridModal";
import MobileTabs from "@/components/ui/MobileTabs";
import MediaCarouselModal from "@/components/player/MediaCarouselModal";
import MediaMasonryModal from "@/components/player/MediaMasonryModal";

// =====================================================================
// DEMO PLAYER LOCKER
// ---------------------------------------------------------------------
// A self-contained, offline-safe locker page for showcasing BLTZ to
// athletes in meetings. It mirrors the live /player/[slug] layout but
// uses hardcoded demo data and local assets only — no database, no
// network. The athlete below is fictional; any resemblance to a real
// player is coincidental. Tweak the DEMO object to retarget the pitch.
// =====================================================================

const DEMO = {
  fullName: "Marcus Vale",
  position: "Wide Receiver",
  city: "Houston, TX",
  level: "Pro",
  status: "active",
  dob: "1997-03-22",
  heightIn: 73, // 6'1"
  weightLbs: 198,
  gamesPlayed: 92,
  headshot: "/images/Headshot.png",
  hero: "/images/media-5.jpg",
  badge: "/images/SilverHero1.png",
  videoSrc: "/videos/demo-reel.mp4",
  bio:
    "Marcus Vale has been one of the most reliable deep threats in football since he entered the league in 2019. A second-round pick out of Ohio State, he has strung together four straight 1,000-yard seasons, earned two Pro Bowl nods, and built a reputation for showing up in the biggest moments. Off the field, he runs a free youth football camp in his hometown of Houston every summer.",
  // Verified NFL roster badge data
  nfl: {
    team: "Houston Texans",
    draftYear: 2019,
    draftRound: 2,
    draftPick: 54,
    draftTeam: "Houston Texans",
  },
  // Verified college program badge data
  college: {
    name: "Ohio State Buckeyes",
    mascot: "Buckeyes",
    primaryColor: "#BB0000",
  },
};

const DEMO_VIDEOS = [
  {
    id: "d1",
    title: "92-Yard Walk-Off TD vs. Dallas — Week 11",
    thumbnail_url: "/images/Awards/video-thumb.png",
    views: "1.2M",
    userName: "Marcus Vale",
    gamePlayed: "Week 11",
  },
  {
    id: "d2",
    title: "Full Highlights: Conference Championship",
    thumbnail_url: "/images/Awards/video-thumb.png",
    views: "864K",
    userName: "Marcus Vale",
    gamePlayed: "Playoffs",
  },
  {
    id: "d3",
    title: "Top 10 Catches of the Season",
    thumbnail_url: "/images/Awards/video-thumb.png",
    views: "2.1M",
    userName: "Marcus Vale",
    gamePlayed: "Season Recap",
  },
  {
    id: "d4",
    title: "Mic'd Up: Game Day Walkthrough",
    thumbnail_url: "/images/Awards/video-thumb.png",
    views: "540K",
    userName: "Marcus Vale",
    gamePlayed: "Behind the Scenes",
  },
  {
    id: "d5",
    title: "Training Camp: Route-Running Clinic",
    thumbnail_url: "/images/Awards/video-thumb.png",
    views: "318K",
    userName: "Marcus Vale",
    gamePlayed: "Training Camp",
  },
  {
    id: "d6",
    title: "Hometown Hero — Houston Youth Camp",
    thumbnail_url: "/images/Awards/video-thumb.png",
    views: "201K",
    userName: "Marcus Vale",
    gamePlayed: "Community",
  },
];

const DEMO_MEDIA = [
  { id: "m1", url: "/images/media-5.jpg", title: "Game day entrance", credits: "BLTZ", width: 1200, height: 800 },
  { id: "m2", url: "/images/media-6.jpg", title: "Sideline focus", credits: "BLTZ", width: 1200, height: 800 },
  { id: "m3", url: "/images/media-9.jpg", title: "Youth camp, Houston", credits: "BLTZ", width: 1200, height: 800 },
];

function formatDob(dob: string) {
  const d = new Date(dob);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getFullYear()}`;
}

function calcAge(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

export default function DemoLocker() {
  const age = calcAge(DEMO.dob);
  const dobDisplay = formatDob(DEMO.dob);
  const feet = Math.floor(DEMO.heightIn / 12);
  const inches = DEMO.heightIn % 12;

  return (
    <main className="mx-auto max-w-6xl p-2 scrollbar-hide">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:gap-12">
        {/* 1/4 column */}
        <aside className="space-y-2 lg:col-span-1 lg:sticky lg:top-2 lg:h-[calc(100vh-1rem)] lg:overflow-y-auto scrollbar-hide">
          <PlayerHeader
            fullName={DEMO.fullName}
            city={DEMO.city}
            videoSrc={DEMO.videoSrc}
            videoPoster={DEMO.headshot}
            badgeUrl={DEMO.badge}
            avatarUrl={DEMO.headshot}
            stats={[
              { title: "48.2k", subtitle: "fans" },
              { title: "WR", subtitle: "position" },
              { title: "#11", subtitle: "jersey" },
            ]}
            helmets={[{ src: "/images/Helmets/Texans-sm-helmet.png", abbr: "Texans" }]}
            awards={[
              { src: "/images/Awards/Award-AllAmericanIcon.png", abbr: "All-American" },
              { src: "/images/Awards/Award-ConferenceIcon.png", abbr: "Conference Champ" },
              { src: "/images/Awards/Award-RingIcon.png", abbr: "Championship Ring" },
              { src: "/images/Awards/Award-StarIcon.png", abbr: "Pro Bowl" },
              { src: "/images/Awards/Award-JerseyIcon.png", abbr: "Team Captain" },
            ]}
            quote="I play for the kids back home in Houston who think the league is a dream they can't reach. It's reachable. I'm proof."
          />
        </aside>

        {/* 3/4 column */}
        <section className="space-y-2 lg:col-span-3 scrollbar-hide">
          <div className="relative h-48 w-full rounded-t-md overflow-hidden hidden lg:block">
            <Image src={DEMO.hero} alt="Player highlight" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
            <PlayerActionButtons
              playerName={DEMO.fullName}
              playerImage={DEMO.headshot}
              playerBadge={DEMO.badge}
            />
          </div>

          {/* Verified NFL roster badge */}
          <div className="hidden lg:flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 flex-shrink-0 fill-emerald-400">
              <path d="M10 0a10 10 0 100 20 10 10 0 000-20zm4.7 7.3l-5.4 5.4a1 1 0 01-1.4 0L5.3 10a1 1 0 111.4-1.4L8 9.9l4.3-4.3a1 1 0 011.4 1.4z" />
            </svg>
            <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-oswald uppercase tracking-wider">
              <span className="font-bold">Verified NFL roster</span>
              <span className="text-white/90">{DEMO.nfl.team}</span>
              <span className="text-white/60">
                Drafted {DEMO.nfl.draftYear} · Round {DEMO.nfl.draftRound}, Pick {DEMO.nfl.draftPick} by{" "}
                {DEMO.nfl.draftTeam}
              </span>
            </div>
          </div>

          {/* Verified college program badge — themed in the school's color */}
          <div
            className="hidden lg:flex items-center gap-3 rounded-md border px-3 py-2"
            style={{
              borderColor: `${DEMO.college.primaryColor}55`,
              backgroundColor: `${DEMO.college.primaryColor}1a`,
              color: DEMO.college.primaryColor,
            }}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 flex-shrink-0 fill-current">
              <path d="M10 0a10 10 0 100 20 10 10 0 000-20zm4.7 7.3l-5.4 5.4a1 1 0 01-1.4 0L5.3 10a1 1 0 111.4-1.4L8 9.9l4.3-4.3a1 1 0 011.4 1.4z" />
            </svg>
            <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-oswald uppercase tracking-wider">
              <span className="font-bold text-white">Verified college program</span>
              <span className="text-white/90">{DEMO.college.name}</span>
            </div>
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
                    <Image src={DEMO.headshot} alt="Profile" fill className="object-cover rounded-md" />
                  </div>
                </div>

                <div className="flex flex-col gap-1 h-full justify-between">
                  <div className="rounded-md bg-black/20 border border-white/10 p-1 text-white/90 text-center flex items-center justify-center h-full">
                    <div className="text-[8px] opacity-80 inline mr-1 font-oswald">DOB: </div>
                    <div className="text-md font-bebas tracking-wider inline">
                      {dobDisplay}
                      <span className="opacity-70 text-[10px] ml-1 font-oswald tracking-wider align-baseline">
                        (age {age})
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Height</div>
                      <div className="text-sm font-bold font-bebas tracking-wider">
                        {feet}&apos;{inches}
                      </div>
                    </div>
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Weight</div>
                      <div className="text-sm font-bold font-bebas tracking-wider">{DEMO.weightLbs} lbs</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Games Played</div>
                      <div className="text-base font-bold leading-[1.25rem] font-bebas tracking-wider">
                        {DEMO.gamesPlayed}
                      </div>
                    </div>
                    <div className="rounded-md bg-black/20 border border-white/10 p-1 text-center text-white/90">
                      <div className="text-[8px] uppercase tracking-wider opacity-70 font-oswald">Level</div>
                      <div className="text-base font-bold leading-[1.25rem] font-bebas tracking-wider">
                        {DEMO.level}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col h-full min-h-0">
                  <div
                    className="flex-1 rounded-md p-2 text-white/90 leading-relaxed overflow-y-auto min-h-0 scrollbar-hide"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    <p className="text-xxs md:text-xs">{DEMO.bio}</p>
                  </div>
                  <div className="mt-2 flex justify-end flex-shrink-0">
                    <BioModal
                      bioText={DEMO.bio}
                      playerName={DEMO.fullName}
                      playerLevel={DEMO.position}
                      playerStatus={DEMO.status}
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
              <VideoGridModal playerName={DEMO.fullName} videos={DEMO_VIDEOS} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {DEMO_VIDEOS.map((v) => (
                <VideoCard key={v.id} id={v.id} title={v.title} thumbnail_url={v.thumbnail_url} />
              ))}
            </div>
          </div>

          {/* Media */}
          <div className="space-y-3 hidden lg:block">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bebas tracking-widest">Media</h2>
              <MediaMasonryModal mediaItems={DEMO_MEDIA}>
                <button className="text-[#FFBB00] hover:text-[#FFBB00]/80 text-sm underline px-4 uppercase cursor-pointer">
                  SEE ALL
                </button>
              </MediaMasonryModal>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {DEMO_MEDIA.slice(0, 4).map((item, i) => (
                <MediaCarouselModal key={item.id} mediaItems={DEMO_MEDIA} initialIndex={i}>
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

          {/* Mobile view */}
          <div className="lg:hidden">
            <MobileTabs playerName={DEMO.fullName} />
          </div>
        </section>
      </div>
    </main>
  );
}
