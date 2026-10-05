// @vitest-environment-options {"settings":{"disableIframePageLoading":true}}
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import LockerView from "@/app/player/[slug]/LockerView";
import PhotoRoomView from "@/app/player/[slug]/photos/PhotoRoomView";
import { previewContent } from "@/lib/preview-lockers/validation";
import { previewLockerData, previewPhotoData } from "@/lib/preview-lockers/mapper";
const analytics = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/client", () => ({ trackProductEvent: analytics }));
let host: HTMLDivElement; let root: Root; let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  analytics.mockReset(); host = document.createElement("div"); document.body.append(host); root = createRoot(host); fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const record = { ...previewContent.parse({ slug: "canonical-slug-collision", full_name: "Synthetic Preview", bio: "Entered career story", schools: [{ label: "Fixture College", color: "#152238" }], awards: [{ year: "2001", label: "Synthetic honor" }], headshot_url: "https://custom.example.com/portrait.jpg", photos: [{ id: "photo", title: "Career photo", url: "https://custom.example.com/career.jpg", level: "cfb" }] }), id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" };
it("keeps the Getty demo row out of the main locker", async () => {
  await act(async () => root.render(<LockerView data={previewLockerData(record)} />));
  expect(host.querySelector('section[aria-label="Related media"]')).toBeNull();
  expect(host.textContent).not.toContain("Powered by Getty Images");
  expect(analytics).not.toHaveBeenCalled();
});

it("selects related preview images in Photo Room and keeps uploaded provenance", async () => {
  vi.stubGlobal("scrollTo", vi.fn());
  const twoPhotos = { ...record, photos: [...record.photos, { ...record.photos[0], id: "second", title: "Second career photo", url: "https://custom.example.com/second.jpg", credits: "Uploaded photographer" }] };
  await act(async () => root.render(<PhotoRoomView data={previewPhotoData(twoPhotos)} />));
  const button = host.querySelector<HTMLButtonElement>('button[aria-label="Show related photo: Second career photo"]')!;
  expect(button.title).toContain("Uploaded photographer");
  await act(async () => button.click());
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(host.querySelector('section[aria-label="Related media"]')?.getAttribute("data-context-image-id")).toBe("second");
  expect(host.textContent).toContain("Resume slideshow");
  expect(analytics).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("restores portrait and landscape gallery proportions when cached images load before hydration", async () => {
  const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  const width = vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockImplementation(function (this: HTMLImageElement) {
    return this.getAttribute("src")?.includes("portrait") ? 600 : 1600;
  });
  const height = vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(900);
  try {
    const photos = [
      { ...record.photos[0], id: "portrait", url: "https://custom.example.com/portrait.jpg" },
      { ...record.photos[0], id: "landscape", url: "https://custom.example.com/landscape.jpg" },
    ];
    await act(async () => root.render(<PhotoRoomView data={previewPhotoData({ ...record, photos })} />));
    const tiles = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Photo grid"] button')];
    expect(Number(tiles[0].style.getPropertyValue("--photo-ratio"))).toBeCloseTo(2 / 3);
    expect(Number(tiles[1].style.getPropertyValue("--photo-ratio"))).toBeCloseTo(16 / 9);
    expect(analytics).not.toHaveBeenCalled();
  } finally { complete.mockRestore(); width.mockRestore(); height.mockRestore(); }
});
it("keeps full private Locker tabs without telemetry or canonical links", async () => {
  await act(async () => root.render(<LockerView data={previewLockerData(record)} />));
  const tab = [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === "CAREER")!;
  await act(async () => tab.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true })));
  expect(host.textContent).toContain("FC");
  const awards = [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === "AWARDS")!; await act(async () => awards.click()); expect(host.textContent).toContain("Synthetic honor");
  expect(host.textContent).not.toMatch(/POOL EARNINGS|TEAMMATES SPLIT|25%|14,208|842K/);
  expect(host.querySelector('a[href^="/player/"]')).toBeNull();
  expect(host.querySelector('a[href="/preview-lockers/canonical-slug-collision/photos"]')).not.toBeNull();
  expect(host.querySelector('button[aria-controls="spotify-preview-track"]')).not.toBeNull();
  expect(analytics).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
});
it("keeps private Photos navigation and bypasses public image optimization", async () => {
  await act(async () => root.render(<PhotoRoomView data={previewPhotoData(record)} />));
  expect(host.querySelector('a[href^="/player/"]')).toBeNull(); expect(host.querySelector('a[href="/preview-lockers/canonical-slug-collision"]')).not.toBeNull();
  expect(host.querySelector('img[src="https://custom.example.com/career.jpg"]')).not.toBeNull(); expect(analytics).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
});

it("opens Photo Room on All and renders an optional linked banner only when complete", async () => {
  const data = previewPhotoData({ ...record, photos: [record.photos[0], { ...record.photos[0], id: "second", title: "School photo", level: "hs" }], photo_room_banner_url: "https://ads.example.com/banner.jpg", photo_room_banner_link: "https://brand.example.com/campaign" });
  await act(async () => root.render(<PhotoRoomView data={data} />));
  const filters = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Filter photos"] button[aria-pressed]')];
  expect(filters[0].textContent).toBe("ALL");
  expect(filters[0].getAttribute("aria-pressed")).toBe("true");
  expect(host.querySelectorAll('[aria-label="Photo grid"] button[aria-label^="View "]')).toHaveLength(2);
  expect(host.querySelector('aside[aria-label="Advertisement"] a')?.getAttribute("href")).toBe("https://brand.example.com/campaign");
  expect(host.querySelector('aside[aria-label="Advertisement"] img')?.getAttribute("src")).toBe("https://ads.example.com/banner.jpg");
  await act(async () => root.render(<PhotoRoomView data={{ ...data, adBanner: null }} />));
  expect(host.querySelector('aside[aria-label="Advertisement"]')).toBeNull();
});

it("keeps the hero video muted without playback controls and centers section headings", async () => {
  const data = previewLockerData(record);
  data.heroVideos = undefined;
  data.heroVideoUrl = "https://custom.example.com/hero.mp4";
  await act(async () => root.render(<LockerView data={data} />));
  expect(host.querySelector('.locker-hero-video')).not.toBeNull();
  const hero = host.querySelector<HTMLVideoElement>('.locker-hero-video')!;
  const backdrop = host.querySelector<HTMLVideoElement>('.locker-hero-video-backdrop')!;
  expect(hero.muted).toBe(true);
  expect(backdrop.muted).toBe(true);
  expect(hero.volume).toBe(0);
  expect(backdrop.volume).toBe(0);
  await act(async () => {
    hero.muted = false;
    hero.volume = 1;
    hero.dispatchEvent(new Event("volumechange", { bubbles: true }));
  });
  expect(hero.muted).toBe(true);
  expect(hero.volume).toBe(0);
  expect(host.querySelector('button[aria-label="Pause hero video"], button[aria-label="Play hero video"], button[aria-label="Unmute hero video"], button[aria-label="Mute hero video"]')).toBeNull();

  const selectFilter = async (label: string) => {
    const button = [...host.querySelectorAll<HTMLButtonElement>('.locker-filter-pill')].find(node => node.textContent === label)!;
    await act(async () => button.click());
    const heading = [...host.querySelectorAll('h2')].find(node => node.textContent === (label === "STORY" ? "THE STORY" : label === "MERCH" ? "MERCHANDISE" : label));
    expect(heading?.style.textAlign).toBe("center");
  };
  await selectFilter("MEASURABLES");
  await selectFilter("STORY");
  const mediaTab = [...host.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.trim() === "MEDIA")!;
  await act(async () => mediaTab.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true })));
  await selectFilter("MERCH");
  await selectFilter("SOCIAL");
});

it("rotates every selected hero photo and never falls back to excluded images", async () => {
  vi.useFakeTimers();
  try {
    const photos = Array.from({ length: 4 }, (_, i) => ({ ...record.photos[0], id: `p${i}`, url: `https://custom.example.com/${i}.png`, inHeroSlideshow: true }));
    const data = previewLockerData({ ...record, photos });
    await act(async () => root.render(<LockerView data={data} />));
    expect(host.querySelector('.locker-hero-photo')?.getAttribute('src')).toBe(photos[0].url);
    await act(async () => vi.advanceTimersByTime(18000));
    expect(host.querySelector('.locker-hero-photo')?.getAttribute('src')).toBe(photos[3].url);
    await act(async () => root.render(<LockerView data={{ ...data, photos: data.photos.map(photo => ({ ...photo, inHeroSlideshow: false })) }} />));
    expect(host.querySelector('.locker-hero-photo')).toBeNull();
    expect(host.querySelectorAll('.locker-hero-media img')).toHaveLength(0);
  } finally { vi.useRealTimers(); }
});

it("uses assigned award art and real social posts in the existing grids", async () => {
 const data=previewLockerData({...record, awards:[{year:"2020",label:"Special Honor",imageUrl:"https://custom.example.com/trophy.png"}],social:[{id:"post",title:"Career update",platform:"X",kind:"post",format:"square",sourceUrl:"https://x.com/athlete/status/123",caption:"My career update",handle:"@athlete"},{id:"reel",title:"Training reel",platform:"Instagram",kind:"short",format:"portrait",sourceUrl:"https://www.instagram.com/reel/fixture/",caption:"Training",handle:"@athlete"}]});
 await act(async () => root.render(<LockerView data={data} />));
 const click=async (text:string) => { const button=[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!; expect(button).toBeTruthy(); await act(async()=>button.click()); };
 const tab=async(text:string)=> {const button=[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!; await act(async()=>button.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true})));};
 await tab('CAREER'); await click('AWARDS');
 expect(host.querySelector('img[src="https://custom.example.com/trophy.png"]')).not.toBeNull();
 await tab('MEDIA'); await click('SOCIAL');
 expect(host.querySelector('.locker-social-layout--desktop')).not.toBeNull();
 expect(host.querySelector('.locker-social-card--square')?.textContent).toContain('My career update');
 await act(async()=>host.querySelector<HTMLButtonElement>('.locker-social-card')!.click());
 expect(host.querySelector('a[href="https://x.com/athlete/status/123"]')).not.toBeNull();
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Close social post"]')!.click());
 await click('MERCH');
 expect(host.querySelector('.locker-merch-grid')).not.toBeNull();
 expect(host.querySelectorAll('.locker-merch-grid article')).toHaveLength(4);
 expect(host.querySelector('.locker-merch-grid a')).toBeNull();
 expect(host.querySelectorAll('.locker-merch-buy:disabled')).toHaveLength(4);
 expect(host.textContent).toContain('Sample · not for sale');
 expect(host.querySelector('[aria-label="Open short: Training reel"]')).toBeNull();
});
it("uses the supplied third-party merchandise URL for Buy Now", async () => {
 const productUrl = "https://shop.example.com/cards?ref=bltz";
 await act(async () => root.render(<LockerView data={{...previewLockerData(record), merch:[{id:"card",title:"Trading Card",imageUrl:"/images/merch-preview/jersey.svg",productUrl}]}} />));
 const media = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'MEDIA')!;
 await act(async () => media.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true})));
 const merch = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'MERCH')!;
 await act(async () => merch.click());
 const buy = host.querySelector<HTMLAnchorElement>('a.locker-merch-buy')!;
 expect(buy.textContent).toBe('Buy Now');
 expect(buy.getAttribute('href')).toBe(productUrl);
 expect(buy.target).toBe('_blank');
 expect(buy.rel).toContain('noopener');
 expect(buy.rel).toContain('sponsored');
 expect(host.querySelectorAll('.locker-merch-grid article')).toHaveLength(1);
});
