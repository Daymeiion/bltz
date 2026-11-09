import type {
  AccessibleOrganization,
  OrganizationContext,
  OrganizationWorkspaceOptions,
} from "@/lib/organization/types";
import type { IntegrationStatus } from "@/lib/enterprise-crm/pilot/integrations-shared";
import type { AthleteFile, PilotActivation, PilotAthleteMedia, PilotLaunch, PilotRoster, PilotSocialReach } from "@/lib/enterprise-crm/pilot/types";

export const PREVIEW_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

export const previewContext: OrganizationContext = {
  userId: "22222222-2222-4222-8222-222222222222",
  organization: {
    id: PREVIEW_ORGANIZATION_ID,
    name: "Cal Athletics",
    organizationType: "school_athletics",
    status: "approved",
    schoolId: null,
  },
  access: {
    scope: "organization",
    membershipId: "33333333-3333-4333-8333-333333333333",
    role: "organization_admin",
  },
};

export const previewOrganizations: AccessibleOrganization[] = [
  { organization: previewContext.organization, access: previewContext.access },
];

export const previewOptions: OrganizationWorkspaceOptions = { teams: [], seasons: [] };

/** Fictional former players. Locker links point at the demo Locker. */
export const previewRoster: PilotRoster = {
  state: "ready",
  players: [
    { id: "p1", name: "Marcus Hale", position: "WR", team: "Cal 2012–15", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "10 years since his first career touchdown", targetDate: "2026-11-04", daysUntil: 2, verdict: "act_now" }, signalCount: 3 },
    { id: "p2", name: "Dre Coleman", position: "LB", team: "Cal 2008–11", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "Turns 35", targetDate: "2026-11-07", daysUntil: 5, verdict: "act_now" }, signalCount: 1 },
    { id: "p3", name: "Jalen Brooks", position: "QB", team: "Cal 2014–17", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "5 years since his pro debut", targetDate: "2026-11-08", daysUntil: 6, verdict: "act_now" }, signalCount: 2 },
    { id: "p4", name: "Terrence Wade", position: "RB", team: "Cal 2010–13", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "15-year game anniversary", targetDate: "2026-11-19", daysUntil: 17, verdict: "prepare" }, signalCount: 1 },
    { id: "p5", name: "Dante Hughes", position: "CB", team: "Cal Berkeley 2003–06", portraitUrl: "/images/Headshot.png", lockerHref: "/player/dante-hughes", next: { headline: "20 years since his Lott IMPACT Trophy season", targetDate: "2026-11-28", daysUntil: 26, verdict: "prepare" }, signalCount: 1 },
    { id: "p6", name: "Andre Fulton", position: "DE", team: "Cal 2005–08", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "Career anniversary", targetDate: "2027-01-12", daysUntil: 71, verdict: "plan" }, signalCount: 1 },
    { id: "p7", name: "Kevin Osei", position: "TE", team: "Cal 2013–16", portraitUrl: null, lockerHref: "/player/demo-player", next: null, signalCount: 0 },
  ],
};


function activation(id: string, playerIds: string[], values: Partial<PilotActivation>): PilotActivation {
  const athletes = playerIds.flatMap((playerId) => {
    const player = previewRoster.players.find((row) => row.id === playerId);
    return player ? [{ id: player.id, name: player.name, portraitUrl: player.portraitUrl }] : [];
  });
  return {
    id, playerId: playerIds[0], playerName: athletes[0]?.name ?? null, athletes, media: [], kind: "post", title: "", brief: null, signalKey: null, momentId: null, dueOn: null,
    status: "planned", channel: null, postUrl: null, postedAt: null, impressions: null, engagements: null, visits: 0,
    trackedHref: "/player/demo-player", createdAt: "2026-10-20T15:00:00.000Z", ...values,
  };
}

export const previewActivations: PilotActivation[] = [
  activation("a5", ["p3"], { kind: "article", title: "Where are they now: Jalen Brooks", status: "posted", channel: "website", postedAt: "2026-10-22T15:00:00.000Z", impressions: 6100, engagements: 240, visits: 97 }),
  activation("a1", ["p1"], { title: "10 years since his first career touchdown", dueOn: "2026-11-04", signalKey: "p1-s1" }),
  activation("a2", ["p4"], { kind: "video", title: "Bowl game highlight throwback", status: "posted", channel: "instagram", postedAt: "2026-10-26T18:00:00.000Z", impressions: 48200, engagements: 3110, visits: 412 }),
  activation("a3", ["p2", "p1", "p3"], { kind: "event", title: "Homecoming legends sideline appearance", status: "posted", channel: "in_person", postedAt: "2026-10-18T20:00:00.000Z", impressions: 12000, engagements: 860, visits: 155 }),
  activation("a4", ["p6", "p2", "p7", "p5", "p4"], { kind: "campaign", title: "Letterwinner fund spotlight: defense legends", status: "posted", channel: "email", postedAt: "2026-10-09T14:00:00.000Z", impressions: 9400, engagements: 610, visits: 238 }),
];

export const previewReach: Record<string, PilotSocialReach[]> = {
  p1: [
    { platform: "instagram", handle: "@marcushale", followers: 84200, recordedAt: "2026-10-30T12:00:00.000Z" },
    { platform: "x", handle: "@mhale12", followers: 31800, recordedAt: "2026-10-30T12:00:00.000Z" },
  ],
};

/** Sample signals carry what they are about, read from the sample headline. */
function subjectOf(headline: string): { type: NonNullable<AthleteFile["signals"][number]["type"]>; years: number | null } {
  const birthday = /^Turns (\d+)/.exec(headline);
  if (birthday) return { type: "birthday", years: Number(birthday[1]) };
  const years = /^(\d+)[ -]year/.exec(headline);
  return { type: "anniversary", years: years ? Number(years[1]) : null };
}

export function previewAthleteFile(playerId: string): AthleteFile | null {
  const player = previewRoster.players.find((row) => row.id === playerId);
  if (!player) return null;
  const signal = player.next ? [{
    key: `${player.id}-s1`,
    // Dante's sample signal is a season milestone, not one of the generic sample games.
    momentId: player.id === "p5" ? null : `${player.id}-m1`, headline: player.next.headline,
    explanation: `${player.name}'s recorded game on this date is a natural throwback moment for fans and letterwinners.`,
    targetDate: player.next.targetDate, daysUntil: player.next.daysUntil, verdict: player.next.verdict, priority: 82, confidence: 0.92, sources: 2,
    ...subjectOf(player.next.headline),
    evidence: [
      { label: "Sample: conference stats feed", url: null, note: `Season record for ${player.name}, checked against the box score.` },
      { label: "Sample: school media guide", url: null, note: "Career history and honors, reviewed by BLTZ." },
    ],
  }] : [];
  return {
    player,
    state: "ready",
    evaluatedAt: "2026-11-02T15:00:00.000Z",
    signals: [...signal, { key: `${player.id}-s2`, momentId: null, headline: "Turns 33", explanation: "A reviewed birthday on the player's Locker record.", targetDate: "2027-02-14", daysUntil: 104, verdict: "upcoming", priority: 40, confidence: 1, sources: 1, type: "birthday", years: 33 }],
    opportunities: signal.length ? [{ key: `${player.id}-o1`, label: "Anniversary retrospective", explanation: "Pair the throwback with archive photos and the player's Locker link.", strength: 78, signalKeys: [signal[0].key] }] : [],
    moments: [
      { id: `${player.id}-m1`, title: "First career touchdown vs. Ridgeview", date: "2016-11-04", status: "verified", sources: 2,
        stats: [{ label: "rec yds", value: "112" }, { label: "rec", value: "7" }, { label: "rec TD", value: "1" }],
        sourceLinks: [{ label: "Sample: conference stats feed", url: null, note: "Box score for the game, checked by BLTZ." }, { label: "Sample: school game notes", url: "https://example.com/sample-game-notes", note: "Postgame notes from the athletics department." }] },
      { id: `${player.id}-m2`, title: "Conference championship game", date: "2015-12-05", status: "verified", sources: 3,
        stats: [{ label: "rec yds", value: "86" }, { label: "rec", value: "5" }], sourceLinks: [{ label: "Sample: conference stats feed", url: null, note: "Box score for the game." }] },
      { id: `${player.id}-m3`, title: "Career-high 186 receiving yards", date: "2015-10-17", status: "candidate", sources: 1 },
    ],
    seasons: [
      { id: "s3", season: "2015", team: "Cal", line: "1,204 rec yds · 78 rec · 11 rec TD" },
      { id: "s2", season: "2014", team: "Cal", line: "866 rec yds · 59 rec · 6 rec TD" },
      { id: "s1", season: "2013", team: "Cal", line: "402 rec yds · 31 rec · 2 rec TD" },
    ],
    // Sample coverage; real files list verified articles and interviews from BLTZ research.
    research: [
      { id: `${player.id}-r1`, title: `Sample: ${player.name} career retrospective`, url: "https://example.com/sample-retrospective", publisher: "Sample publication", type: "article" as const, date: "2021-09-14", aboutDate: null },
      { id: `${player.id}-r2`, title: `Sample: Where are they now with ${player.name}`, url: "https://example.com/sample-interview", publisher: "Sample podcast", type: "interview" as const, date: "2024-03-02", aboutDate: null },
      { id: `${player.id}-r4`, title: `Sample: Game recap, ${player.name} scores first touchdown`, url: "https://example.com/sample-recap", publisher: "Sample student paper", type: "article" as const, date: "2016-11-05", aboutDate: "2016-11-04" },
      { id: `${player.id}-r3`, title: `Sample: ${player.name} highlight reel`, url: "https://example.com/sample-video", publisher: "Sample video channel", type: "video" as const, date: "2019-11-20", aboutDate: null },
    ],
    socialLinks: playerId === "p1" ? [{ platform: "Instagram", handle: "@marcushale", url: "https://www.instagram.com/p/demo/" }]
      : playerId === "p5" ? [{ platform: "Instagram", handle: "@reallifedh", url: "https://www.instagram.com/reallifedh/" }]
      : [],
  };
}

export const previewLaunches: PilotLaunch[] = [
  { id: "l1", playerId: null, playerName: "Chris Okafor", position: "S", years: "2009–12", contactEmail: null, message: null, status: "building", statusNote: null, createdAt: "2026-10-30T16:00:00.000Z",
    media: [
      { id: "lm1", playerId: null, launchId: "l1", kind: "business", title: "Okafor Realty Group", url: null, description: "Residential real estate", occurredOn: "2019-11-12", reviewStatus: "pending", createdAt: "2026-10-30T16:00:00.000Z", source: "link", thumbUrl: null, activationId: null },
      { id: "lm2", playerId: null, launchId: "l1", kind: "highlight", title: "2011 pick-six vs. Eastport", url: null, description: null, occurredOn: null, reviewStatus: "pending", createdAt: "2026-10-30T16:00:00.000Z", source: "link", thumbUrl: null, activationId: null },
    ] },
  { id: "l2", playerId: "p3", playerName: "Jalen Brooks", position: "QB", years: null, contactEmail: null, message: null, status: "live", statusNote: null, createdAt: "2026-10-12T16:00:00.000Z", media: [] },
];

export const previewMedia: Record<string, PilotAthleteMedia[]> = {
  p1: [
    { id: "m1", playerId: "p1", launchId: null, kind: "business", title: "Hale Performance Training", url: null, description: "Speed and strength training for youth athletes", occurredOn: "2023-11-20", reviewStatus: "approved", createdAt: "2026-10-01T12:00:00.000Z", source: "link", thumbUrl: null, activationId: null },
    { id: "m2", playerId: "p1", launchId: null, kind: "highlight", title: "2015 conference title highlights", url: null, description: null, occurredOn: null, reviewStatus: "pending", createdAt: "2026-10-28T12:00:00.000Z", source: "link", thumbUrl: null, activationId: null },
  ],
};

/** Sample school colors (Cal Berkeley Blue and California Gold) so previews show the school canvas. No logo: the stadium drawing shows instead. */
export const previewTheme = { mode: "school" as const, accent: "#003262", highlight: "#fdb515", logoUrl: null };

/** California Memorial Stadium from Wikimedia Commons; CC BY 4.0 requires the credit line. */
export const previewArt = { url: "/images/crm/cal-memorial-stadium.webp", credit: "Stadium photo: Quintin Soloviev, CC BY 4.0, via Wikimedia Commons" };

/** Sample connections: Slack connected, Teams and the website not yet. */
export const previewIntegrations: IntegrationStatus[] = [{ kind: "slack", label: "#athletics-social", updatedAt: "2026-11-03T15:00:00.000Z" }];
