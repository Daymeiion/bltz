import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThisWeek } from "@/components/organization/pilot/ThisWeek";
import { AthleteDirectory } from "@/components/organization/pilot/AthleteDirectory";
import { AthleteIntelligence } from "@/components/organization/pilot/AthleteIntelligence";
import { LaunchLocker } from "@/components/organization/pilot/LaunchLocker";
import { previewActivations, previewAthleteFile, previewMedia, previewRoster } from "@/components/organization/pilot/preview-data";
import { filterSchoolRoster, schoolKey } from "@/lib/enterprise-crm/pilot/former-players";
import { mergeMediaSignals } from "@/lib/enterprise-crm/pilot/launches";
import { mediaAnniversary, mediaSignals, summarizeReach } from "@/lib/enterprise-crm/pilot/types";
import type { WorkspaceAthleteSummary } from "@/lib/intelligence/workspace-types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/intelligence/workspace-server", () => ({ loadSignalDirectory: vi.fn() }));

let container: HTMLDivElement;
let root: Root;
const TODAY = new Date("2026-11-02T15:00:00.000Z");

function render(node: React.ReactNode) {
  act(() => root.render(node));
}

function typeInto(input: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function athlete(overrides: Partial<WorkspaceAthleteSummary>): WorkspaceAthleteSummary {
  return {
    id: "a1", name: "Marcus Hale", slug: "marcus-hale", school: "Westlake", position: "WR", teamLabel: null,
    portraitUrl: null, priority: 80, priorityLabel: "High", hasIntelligence: true, intelligenceState: "ready",
    next: { type: "birthday", targetDate: "2026-11-04", daysUntil: 2, verdict: "act_now", headline: "Turns 35" },
    pendingReview: 0, signalCount: 1, link: null, cohort: true,
    ...overrides,
  };
}

const ready = { state: "ready" as const, activations: previewActivations };

describe("pilot pages", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("leads the Overview with the players whose moment is within 7 days", () => {
    render(<ThisWeek schoolName="Westlake" roster={previewRoster} activity={ready} intelligenceHref="/i" />);

    expect(container.querySelector("h1")?.getAttribute("aria-label")).toBe("Every legend deserves an encore.");
    expect(container.querySelector(".pilot-hero__lede")).toBeNull();
    const actNow = container.querySelector('[aria-label="Act now"]');
    expect([...actNow!.querySelectorAll(".pilot-row__name")].map((node) => [node.textContent, node.getAttribute("href")])).toEqual([
      ["Marcus Hale", "/i/p1"], ["Dre Coleman", "/i/p2"], ["Jalen Brooks", "/i/p3"],
    ]);
    expect(container.querySelector('[aria-label="Coming up"]')?.textContent).toContain("Terrence Wade");
  });

  it("shows past activity and its reach on the Overview", () => {
    render(<ThisWeek schoolName="Westlake" roster={previewRoster} activity={ready} intelligenceHref="/i" />);

    const activity = container.querySelector('[aria-label="Activity and reach"]')!;
    expect(activity.textContent).toContain("76K");
    expect(activity.textContent).toContain("902");
    expect(activity.textContent).toContain("Bowl game highlight throwback");
  });

  it("sorts activity by type and shows every featured athlete", async () => {
    render(<ThisWeek schoolName="Westlake" roster={previewRoster} activity={ready} intelligenceHref="/i" />);
    const activity = container.querySelector('[aria-label="Activity and reach"]')!;
    const titles = () => [...activity.querySelectorAll(".pilot-activity__title strong")].map((node) => node.textContent);
    expect(titles()).toHaveLength(5);

    act(() => [...activity.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((tab) => tab.textContent?.startsWith("Events"))!.click());
    await vi.waitFor(() => expect(titles()).toEqual(["Homecoming legends sideline appearance"]));
    expect(activity.querySelector(".pilot-reach-strip")?.textContent).toContain("12K");

    const avatars = [...activity.querySelectorAll<HTMLAnchorElement>(".pilot-avatar")];
    expect(avatars.map((link) => [link.querySelector(".pilot-avatar__name")?.textContent, link.getAttribute("href")])).toEqual([
      ["Dre Coleman", "/i/p2"], ["Marcus Hale", "/i/p1"], ["Jalen Brooks", "/i/p3"],
    ]);
  });

  it("puts the player search on the Overview", () => {
    render(<ThisWeek schoolName="Westlake" roster={previewRoster} activity={ready} intelligenceHref="/i" />);
    const players = container.querySelector('nav[aria-label="Former players"]')!;
    expect(players.querySelectorAll("a")).toHaveLength(7);
    typeInto(players.querySelector<HTMLInputElement>('input[aria-label="Find a player"]')!, "wade");
    expect([...players.querySelectorAll("a strong")].map((node) => node.textContent)).toEqual(["Terrence Wade"]);
  });

  it("shows how the pilot works until the member dismisses it, then remembers", async () => {
    window.localStorage.removeItem("bltz-pilot-how-it-works");
    render(<ThisWeek schoolName="Westlake" roster={previewRoster} activity={ready} intelligenceHref="/i" />);
    const notice = () => container.querySelector('[aria-label="How the pilot works"]');
    expect(notice()?.textContent).toContain("nothing for your staff to approve");

    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Dismiss how the pilot works"]')!.click());
    await vi.waitFor(() => expect(notice()).toBeNull());
    expect(window.localStorage.getItem("bltz-pilot-how-it-works")).toBe("dismissed");

    act(() => root.unmount());
    root = createRoot(container);
    render(<ThisWeek schoolName="Westlake" roster={previewRoster} activity={ready} intelligenceHref="/i" />);
    expect(notice()).toBeNull();
  });

  it("links every player to the public Locker and offers a fan link", () => {
    render(<ThisWeek schoolName="Westlake" roster={previewRoster} activity={ready} intelligenceHref="/i" />);

    const open = container.querySelector<HTMLAnchorElement>('[aria-label="Act now"] a.pilot-pill--primary');
    expect(open?.getAttribute("href")).toBe("/player/demo-player");
    expect(open?.getAttribute("target")).toBe("_blank");
    expect(container.querySelector('button[aria-label="Copy fan link for Marcus Hale"]')).not.toBeNull();
  });

  it("shows onboarding guidance before any player is linked", () => {
    render(<ThisWeek schoolName="Westlake" roster={{ state: "ready", players: [] }} activity={{ state: "ready", activations: [] }} intelligenceHref="/i" />);

    expect(container.textContent).toContain("BLTZ builds Lockers for your roster during onboarding");
  });

  it("lists the directory soonest moment first and filters by name", () => {
    render(<AthleteDirectory schoolName="Westlake" roster={previewRoster} profileBaseHref="/i" />);
    const names = () => [...container.querySelectorAll(".pilot-row__name")].map((node) => node.textContent);
    expect(names()[0]).toBe("Marcus Hale");
    expect(names().at(-1)).toBe("Kevin Osei");

    typeInto(container.querySelector<HTMLInputElement>('input[aria-label="Find a player"]')!, "osei");
    expect(names()).toEqual(["Kevin Osei"]);
  });

  it("renders the athlete file with engine and school signals together", () => {
    render(<AthleteIntelligence organizationId="org" schoolName="Westlake" file={previewAthleteFile("p1")!} initialActivations={[]} initialReach={[]} initialMedia={previewMedia.p1} canManage profileBaseHref="/i" preview />);

    const signals = [...container.querySelectorAll(".pilot-signal > strong")].map((node) => node.textContent);
    expect(signals).toContain("10 years since his first career touchdown");
    expect(signals.some((text) => text?.startsWith("Hale Performance Training turns"))).toBe(true);

    act(() => container.querySelector<HTMLButtonElement>("#folder-tab-moments")!.click());
    return vi.waitFor(() => expect(container.querySelector('[aria-label="From your school"]')?.textContent).toContain("With BLTZ for review"));
  });

  it("lays out players, the selected file, and signals, activations and analytics", () => {
    render(<AthleteIntelligence organizationId="org" schoolName="Westlake" file={previewAthleteFile("p4")!} roster={previewRoster.players} contactEmail="terrence@example.com" initialActivations={previewActivations.filter((row) => row.playerId === "p4")} initialReach={[]} canManage profileBaseHref="/i" preview />);

    const players = container.querySelector('nav[aria-label="Former players"]')!;
    expect(players.querySelectorAll("a")).toHaveLength(7);
    expect(players.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe("/i/p4");
    expect(container.querySelector(".pilot-id__contact")?.textContent).toContain("terrence@example.com");
    const right = container.querySelector('[aria-label="Signals, activations and analytics"]')!;
    expect(right.querySelector('[aria-label="Analytics"]')?.textContent).toContain("48K");
    expect(right.querySelector('[aria-label="Activations list"]')?.textContent).toContain("Bowl game highlight throwback");
  });

  it("files the center column into Intelligence, Moments and Opportunities tabs", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<AthleteIntelligence organizationId="org" schoolName="Westlake" file={previewAthleteFile("p4")!} roster={previewRoster.players} initialActivations={previewActivations.filter((row) => row.playerId === "p4")} initialReach={[]} canManage profileBaseHref="/i" preview />);

    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.querySelector(".pilot-folder__tab-label")?.textContent)).toEqual(["Intelligence", "Moments", "Opportunities"]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector('[aria-label="Activation detail"]')).toBeNull();

    // Picking an activation on the right opens the Opportunities tab with it in detail.
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Activations list"] button[aria-pressed]')!.click());
    await vi.waitFor(() => expect(container.querySelector('[aria-label="Activation detail"]')?.textContent).toContain("Bowl game highlight throwback"));
    expect(container.querySelector('[aria-label="Suggested opportunities"]')).not.toBeNull();
    expect(container.querySelector("#folder-tab-opportunities")?.getAttribute("aria-selected")).toBe("true");

    // Arrow keys move between tabs.
    act(() => container.querySelector('[role="tablist"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(container.querySelector("#folder-tab-intelligence")?.getAttribute("aria-selected")).toBe("true");
  });

  it("highlights a signal in the center when it is picked from the right column", () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<AthleteIntelligence organizationId="org" schoolName="Westlake" file={previewAthleteFile("p1")!} roster={previewRoster.players} initialActivations={[]} initialReach={[]} canManage profileBaseHref="/i" preview />);

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Signals list"] button')!.click());
    return vi.waitFor(() => expect(container.querySelector(".pilot-signal--focus strong")?.textContent).toBe("10 years since his first career touchdown"));
  });

  it("hides planning controls from members who cannot manage activations", () => {
    render(<AthleteIntelligence organizationId="org" schoolName="Westlake" file={previewAthleteFile("p1")!} initialActivations={[]} initialReach={[]} canManage={false} profileBaseHref="/i" />);

    expect(container.textContent).not.toContain("Plan activation");
    expect(container.querySelector('button[aria-label="New activation"]')).toBeNull();
  });

  it("plans an activation from a signal and saves it through the workspace API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ activation: { ...previewActivations[0], id: "new", signalKey: "p3-s1", playerId: "p3" } }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<AthleteIntelligence organizationId="org-1" schoolName="Westlake" file={previewAthleteFile("p3")!} initialActivations={[]} initialReach={[]} canManage profileBaseHref="/i" />);

    act(() => [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Plan activation"))!.click());
    expect(container.querySelector<HTMLInputElement>('.pilot-modal input:not([type])')?.value).toBe("5 years since his pro debut");
    await act(async () => { container.querySelector<HTMLFormElement>(".pilot-modal__panel")!.requestSubmit(); });

    expect(fetchMock).toHaveBeenCalledWith("/api/organization/org-1/activations", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ playerId: "p3", kind: "post", signalKey: "p3-s1", dueOn: "2026-11-08", additionalPlayerIds: [] });
    vi.unstubAllGlobals();
  });

  it("features other former players when planning an activation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ activation: { ...previewActivations[0], id: "new" } }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<AthleteIntelligence organizationId="org-1" schoolName="Westlake" file={previewAthleteFile("p1")!} roster={previewRoster.players} initialActivations={[]} initialReach={[]} canManage profileBaseHref="/i" />);

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Activations list"] button[aria-label="New activation"]')!.click());
    typeInto(container.querySelector<HTMLInputElement>('.pilot-modal input:not([type])')!, "Reunion night");
    typeInto(container.querySelector<HTMLInputElement>('input[aria-label="Add a featured player"]')!, "dre");
    act(() => container.querySelector<HTMLButtonElement>(".pilot-featuring__matches button")!.click());
    expect(container.querySelector('button[aria-label="Remove Dre Coleman"]')).not.toBeNull();
    await act(async () => { container.querySelector<HTMLFormElement>(".pilot-modal__panel")!.requestSubmit(); });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ playerId: "p1", title: "Reunion night", additionalPlayerIds: ["p2"] });
    vi.unstubAllGlobals();
  });

  it("attaches Getty media to a planned activation and sends it with the save", async () => {
    const getty = { state: "ready", total: 2, images: [
      { id: "72137869", title: "Hale scores", date: "2016-11-04", artist: "Staff", thumb: "https://media.gettyimages.com/a.jpg", detailUrl: "https://www.gettyimages.com/detail/72137869" },
      { id: "72137870", title: "Hale celebrates", date: "2016-11-04", artist: "Staff", thumb: "https://media.gettyimages.com/b.jpg", detailUrl: "https://www.gettyimages.com/detail/72137870" },
    ] };
    const fetchMock = vi.fn((url: string) => Promise.resolve(url.includes("/getty")
      ? { ok: true, json: async () => getty }
      : { ok: true, json: async () => ({ activation: { ...previewActivations[0], id: "new" } }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AthleteIntelligence organizationId="org-1" schoolName="Westlake" file={previewAthleteFile("p1")!} roster={previewRoster.players} initialActivations={[]} initialReach={[]} canManage profileBaseHref="/i" />);

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Activations list"] button[aria-label="New activation"]')!.click());
    typeInto(container.querySelector<HTMLInputElement>('.pilot-modal input:not([type])')!, "Touchdown throwback");
    act(() => container.querySelector<HTMLButtonElement>('.pilot-modal button[aria-label="Add from Getty Images"]')!.click());
    await vi.waitFor(() => expect(document.querySelectorAll(".pilot-getty__tile")).toHaveLength(2));
    expect(fetchMock.mock.calls[0][0]).toContain("/api/organization/org-1/getty?q=Marcus+Hale");

    act(() => document.querySelector<HTMLButtonElement>('.pilot-getty__tile[aria-label="Hale scores"]')!.click());
    act(() => [...document.querySelectorAll<HTMLButtonElement>(".pilot-getty button")].find((button) => button.textContent?.startsWith("Attach"))!.click());
    expect(container.querySelector(".pilot-media-strip--edit")?.textContent).toContain("Hale scores");

    await act(async () => { container.querySelector<HTMLFormElement>(".pilot-modal__panel")!.requestSubmit(); });
    const save = fetchMock.mock.calls.find(([url]) => url === "/api/organization/org-1/activations")!;
    expect(JSON.parse((save as unknown as [string, RequestInit])[1].body as string).media).toEqual([
      { kind: "image", title: "Hale scores", url: "https://www.gettyimages.com/detail/72137869", source: "getty", storagePath: null, thumbUrl: "https://media.gettyimages.com/a.jpg", externalId: "72137869" },
    ]);
    vi.unstubAllGlobals();
  });

  it("sorts school media into Videos, Images and Publications tiles", async () => {
    render(<AthleteIntelligence organizationId="org" schoolName="Westlake" file={previewAthleteFile("p1")!} roster={previewRoster.players} initialActivations={[]} initialReach={[]} initialMedia={previewMedia.p1} canManage profileBaseHref="/i" preview />);
    act(() => container.querySelector<HTMLButtonElement>("#folder-tab-moments")!.click());
    await vi.waitFor(() => expect(container.querySelectorAll(".pilot-hub__tile")).toHaveLength(3));

    const tiles = [...container.querySelectorAll<HTMLButtonElement>(".pilot-hub__tile")];
    expect(tiles.map((tile) => [tile.querySelector("strong")?.textContent, tile.querySelector("em")?.textContent])).toEqual([["Videos", "1"], ["Images", "0"], ["Publications", "1"]]);
    expect(container.querySelector(".pilot-hub__panel")?.textContent).toContain("2015 conference title highlights");
    expect(container.querySelector(".pilot-hub__panel .pilot-attach")?.textContent).toContain("Upload video");

    act(() => tiles[2].click());
    await vi.waitFor(() => expect(container.querySelector(".pilot-hub__panel")?.textContent).toContain("Hale Performance Training"));
    expect(container.querySelector(".pilot-hub__panel .pilot-attach")).toBeNull();
    expect([...container.querySelectorAll(".pilot-hub__panel .pilot-kind-picker button")].map((button) => button.textContent)).toEqual(["Business", "Article or archive"]);
  });

  it("keeps the right column short with Show all", () => {
    const many = Array.from({ length: 6 }, (_, index) => ({ ...previewActivations[1], id: `x${index}`, title: `Post ${index}` }));
    render(<AthleteIntelligence organizationId="org" schoolName="Westlake" file={previewAthleteFile("p4")!} roster={previewRoster.players} initialActivations={many} initialReach={[]} canManage profileBaseHref="/i" preview />);
    const list = container.querySelector('[aria-label="Activations list"]')!;
    expect(list.querySelectorAll(".pilot-side-list li")).toHaveLength(4);
    act(() => list.querySelector<HTMLButtonElement>(".pilot-side-more")!.click());
    return vi.waitFor(() => expect(list.querySelectorAll(".pilot-side-list li")).toHaveLength(6));
  });

  it("launches a Locker with media and shows its progress", () => {
    render(<LaunchLocker organizationId="org" schoolName="Westlake University" players={previewRoster.players} initialLaunches={[]} canManage preview />);

    typeInto(container.querySelector<HTMLInputElement>('input[placeholder="Marcus Hale"]')!, "Chris Okafor");
    typeInto(container.querySelector<HTMLInputElement>('input[placeholder="Hale Performance Training"]')!, "Okafor Realty Group");
    act(() => container.querySelector<HTMLFormElement>(".pilot-launch-form")!.requestSubmit());

    return vi.waitFor(() => {
      expect(container.querySelector(".pilot-launched")?.textContent).toContain("Chris Okafor's Locker is launched.");
      expect(container.querySelector(".pilot-launches__media")?.textContent).toBe("Business: Okafor Realty Group");
      expect(container.querySelector(".pilot-progress--current")?.textContent).toBe("Launched");
    });
  });
});

describe("school roster matching", () => {
  it("normalizes school names", () => {
    expect(schoolKey("University of Westlake Athletics")).toBe("westlake");
    expect(schoolKey("Texas A&M")).toBe(schoolKey("Texas A and M"));
  });

  it("keeps only the school's players that have a public Locker", () => {
    const roster = filterSchoolRoster({
      state: "ready",
      truncated: false,
      rows: [
        athlete({ id: "a1" }),
        athlete({ id: "a2", school: "Desert Ridge" }),
        athlete({ id: "a3", link: { previewId: "p", gsisId: "g", existingPlayerId: null, existingPlayerName: null } }),
      ],
    }, ["Westlake University Athletics"]);

    expect(roster.players.map((player) => [player.id, player.lockerHref])).toEqual([["a1", "/player/marcus-hale"]]);
  });

  it("reports an unavailable directory instead of an empty roster", () => {
    expect(filterSchoolRoster({ state: "unavailable", rows: [], truncated: false }, ["Westlake"]).state).toBe("unavailable");
  });
});

describe("school-connected signals", () => {
  it("turns a founding date into the next business anniversary", () => {
    expect(mediaAnniversary({ kind: "business", title: "Hale Training", occurredOn: "2023-11-20" }, TODAY)).toEqual({ headline: "Hale Training turns 3", targetDate: "2026-11-20", daysUntil: 18, years: 3 });
    expect(mediaAnniversary({ kind: "highlight", title: "the title game", occurredOn: "2015-11-02" }, TODAY)?.headline).toBe("11 years since the title game");
  });

  it("rolls past dates to next year and skips undated or too-recent items", () => {
    expect(mediaAnniversary({ kind: "business", title: "X", occurredOn: "2020-01-05" }, TODAY)?.targetDate).toBe("2027-01-05");
    expect(mediaAnniversary({ kind: "business", title: "X", occurredOn: null }, TODAY)).toBeNull();
    expect(mediaAnniversary({ kind: "business", title: "X", occurredOn: "2026-12-01" }, TODAY)).toBeNull();
  });

  it("uses the engine's verdict scale", () => {
    const [signal] = mediaSignals([{ ...previewMedia.p1[0], occurredOn: "2023-11-05" }], TODAY);
    expect(signal).toMatchObject({ verdict: "act_now", daysUntil: 3 });
  });

  it("promotes a sooner school signal to the player's next moment on the Overview", () => {
    const roster = mergeMediaSignals(previewRoster, [{ ...previewMedia.p1[0], playerId: "p7", occurredOn: "2021-11-03" }], TODAY);
    expect(roster.players.find((player) => player.id === "p7")?.next).toMatchObject({ headline: "Hale Performance Training turns 5", daysUntil: 1 });
    expect(roster.players.find((player) => player.id === "p1")?.next?.headline).toBe(previewRoster.players[0].next?.headline);
  });

  it("totals reach across activations", () => {
    expect(summarizeReach(previewActivations)).toEqual({ posted: 4, planned: 1, impressions: 75700, engagements: 4820, visits: 902 });
  });
});
