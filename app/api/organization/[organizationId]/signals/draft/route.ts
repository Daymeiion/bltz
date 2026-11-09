import { z } from "zod";
import { API_HEADERS, apiError, authorizeWrite, isSchoolPlayer } from "@/lib/enterprise-crm/pilot/api";
import { loadSchoolAthlete, toAthleteFile } from "@/lib/enterprise-crm/pilot/athlete";
import { loadSchoolRoster } from "@/lib/enterprise-crm/pilot/former-players";
import { listAthleteMedia, mergeMediaSignals } from "@/lib/enterprise-crm/pilot/launches";
import { listSchoolSignals, toFileSignal } from "@/lib/enterprise-crm/pilot/school-signals";
import { draftSignal, type DraftContext } from "@/lib/enterprise-crm/pilot/signal-ai";
import { mediaSignals } from "@/lib/enterprise-crm/pilot/types";
import { tavilySearch } from "@/lib/search/tavily";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const input = z.object({ request: z.string().trim().min(5).max(1000), playerId: z.string().uuid().nullable().default(null) }).strict();

/**
 * Drafts a school signal from a plain-language description with Claude, using the
 * school's own roster, the signals BLTZ already tracks, the player's research and a
 * web search. Nothing is saved: staff review the draft and save it themselves.
 */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  const { context } = auth;
  const { playerId } = parsed.data;
  if (playerId && !(await isSchoolPlayer(context, playerId))) return apiError("not_found", 404);

  const [roster, orgMedia, schoolSignals, athlete] = await Promise.all([
    loadSchoolRoster(context),
    listAthleteMedia(context.organization.id),
    listSchoolSignals(context.organization.id),
    playerId ? loadSchoolAthlete(context, playerId) : Promise.resolve(null),
  ]);
  const players = mergeMediaSignals(roster, orgMedia).players;
  const file = athlete ? toAthleteFile(athlete) : null;
  const player = playerId ? players.find((row) => row.id === playerId) ?? null : null;

  const existing: DraftContext["existing"] = [
    ...players.flatMap((row) => row.next ? [{ key: `next:${row.id}`, playerId: row.id, headline: row.next.headline, targetDate: row.next.targetDate }] : []),
    ...schoolSignals.signals.flatMap((signal) => { const next = toFileSignal(signal); return next ? [{ key: next.key, playerId: signal.playerId, headline: next.headline, targetDate: next.targetDate }] : []; }),
    ...(file ? [...file.signals, ...mediaSignals(orgMedia.filter((item) => item.playerId === playerId))].map((signal) => ({ key: signal.key, playerId, headline: signal.headline, targetDate: signal.targetDate })) : []),
  ];
  const web = player ? await tavilySearch(`${player.name} ${context.organization.name} ${parsed.data.request}`, 5).catch(() => []) : [];
  const sources: DraftContext["sources"] = [
    ...(file?.research ?? []).map((item) => ({ id: `research:${item.id}`, title: `${item.title} (${item.publisher})`, url: item.url, detail: [item.date && `published ${item.date}`, item.aboutDate && `about ${item.aboutDate}`].filter(Boolean).join(", ") || null })),
    ...(file?.moments ?? []).flatMap((moment) => (moment.sourceLinks ?? []).map((link, index) => ({ id: `moment:${moment.id}:${index}`, title: `${link.label}: ${moment.title}`, url: link.url, detail: [moment.date && `game date ${moment.date}`, link.note].filter(Boolean).join(". ") || null }))),
    ...web.map((result, index) => ({ id: `web:${index}`, title: result.title, url: result.url, detail: result.snippet?.slice(0, 500) ?? null })),
  ].slice(0, 30);

  const result = await draftSignal({
    request: parsed.data.request,
    schoolName: context.organization.name,
    today: new Date().toISOString().slice(0, 10),
    roster: players.map((row) => ({ id: row.id, name: row.name, position: row.position, team: row.team })),
    existing: [...new Map(existing.map((row) => [row.key, row])).values()],
    moments: (file?.moments ?? []).map((moment) => ({ playerId: playerId!, title: moment.title, date: moment.date })),
    sources,
  });
  if (result.state !== "ready") return Response.json(result, { status: result.state === "not_configured" ? 503 : result.state === "refused" ? 422 : 502, headers: API_HEADERS });
  const byKey = new Map(existing.map((row) => [row.key, row]));
  return Response.json({
    ...result,
    matches: result.matches.flatMap((match) => { const row = byKey.get(match.key); return row ? [{ ...row, reason: match.reason }] : []; }),
  }, { headers: API_HEADERS });
}
