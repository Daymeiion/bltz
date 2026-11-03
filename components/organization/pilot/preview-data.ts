import type {
  AccessibleOrganization,
  OrganizationContext,
  OrganizationWorkspaceOptions,
} from "@/lib/organization/types";
import type { AthleteFile, PilotActivation, PilotAthleteMedia, PilotLaunch, PilotRoster, PilotSocialReach } from "@/lib/enterprise-crm/pilot/types";

export const PREVIEW_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

export const previewContext: OrganizationContext = {
  userId: "22222222-2222-4222-8222-222222222222",
  organization: {
    id: PREVIEW_ORGANIZATION_ID,
    name: "Westlake University Athletics",
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
    { id: "p1", name: "Marcus Hale", position: "WR", team: "Westlake 2012–15", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "10 years since his first career touchdown", targetDate: "2026-11-04", daysUntil: 2, verdict: "act_now" }, signalCount: 3 },
    { id: "p2", name: "Dre Coleman", position: "LB", team: "Westlake 2008–11", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "Turns 35", targetDate: "2026-11-07", daysUntil: 5, verdict: "act_now" }, signalCount: 1 },
    { id: "p3", name: "Jalen Brooks", position: "QB", team: "Westlake 2014–17", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "5 years since his pro debut", targetDate: "2026-11-08", daysUntil: 6, verdict: "act_now" }, signalCount: 2 },
    { id: "p4", name: "Terrence Wade", position: "RB", team: "Westlake 2010–13", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "15-year game anniversary", targetDate: "2026-11-19", daysUntil: 17, verdict: "prepare" }, signalCount: 1 },
    { id: "p5", name: "Isaiah Grant", position: "CB", team: "Westlake 2016–19", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "Turns 30", targetDate: "2026-11-28", daysUntil: 26, verdict: "prepare" }, signalCount: 1 },
    { id: "p6", name: "Andre Fulton", position: "DE", team: "Westlake 2005–08", portraitUrl: null, lockerHref: "/player/demo-player", next: { headline: "Career anniversary", targetDate: "2027-01-12", daysUntil: 71, verdict: "plan" }, signalCount: 1 },
    { id: "p7", name: "Kevin Osei", position: "TE", team: "Westlake 2013–16", portraitUrl: null, lockerHref: "/player/demo-player", next: null, signalCount: 0 },
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

export function previewAthleteFile(playerId: string): AthleteFile | null {
  const player = previewRoster.players.find((row) => row.id === playerId);
  if (!player) return null;
  const signal = player.next ? [{
    key: `${player.id}-s1`, momentId: `${player.id}-m1`, headline: player.next.headline,
    explanation: `${player.name}'s recorded game on this date is a natural throwback moment for fans and letterwinners.`,
    targetDate: player.next.targetDate, daysUntil: player.next.daysUntil, verdict: player.next.verdict, priority: 82, confidence: 0.92, sources: 2,
  }] : [];
  return {
    player,
    state: "ready",
    evaluatedAt: "2026-11-02T15:00:00.000Z",
    signals: [...signal, { key: `${player.id}-s2`, momentId: null, headline: "Turns 33", explanation: "A reviewed birthday on the player's Locker record.", targetDate: "2027-02-14", daysUntil: 104, verdict: "upcoming", priority: 40, confidence: 1, sources: 1 }],
    opportunities: signal.length ? [{ key: `${player.id}-o1`, label: "Anniversary retrospective", explanation: "Pair the throwback with archive photos and the player's Locker link.", strength: 78, signalKeys: [signal[0].key] }] : [],
    moments: [
      { id: `${player.id}-m1`, title: "First career touchdown vs. Ridgeview", date: "2016-11-04", status: "verified", sources: 2 },
      { id: `${player.id}-m2`, title: "Conference championship game", date: "2015-12-05", status: "verified", sources: 3 },
      { id: `${player.id}-m3`, title: "Career-high 186 receiving yards", date: "2015-10-17", status: "candidate", sources: 1 },
    ],
    seasons: [
      { id: "s3", season: "2015", team: "Westlake", line: "1,204 rec yds · 78 rec · 11 rec TD" },
      { id: "s2", season: "2014", team: "Westlake", line: "866 rec yds · 59 rec · 6 rec TD" },
      { id: "s1", season: "2013", team: "Westlake", line: "402 rec yds · 31 rec · 2 rec TD" },
    ],
    socialLinks: playerId === "p1" ? [{ platform: "Instagram", handle: "@marcushale", url: "https://www.instagram.com/p/demo/" }] : [],
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

/** Sample school colors so previews show the school canvas. No logo: the stadium drawing shows instead. */
export const previewTheme = { mode: "school" as const, accent: "#7d1d3a", highlight: "#f2c14e", logoUrl: null };
