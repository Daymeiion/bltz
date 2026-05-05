export const MOCK_VIDEOS_YT = Array.from({ length: 6 }).map((_, i) => ({
    id: `v${i + 1}`,
    title: `Music for Working on a Computer — Focus Mix ${i + 1}`,
    thumbnail: "/images/Awards/video-thumb.png",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    duration: i % 2 ? "12:45" : "3:13:16",
    channel: { name: "Chill Hub" },
    meta: { views: "597K", age: "4 weeks ago" },
  }));
  