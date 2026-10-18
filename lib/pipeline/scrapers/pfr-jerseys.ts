import { decodeHTML } from "entities";
import { stripHtml } from "../fetch";
import { jerseyNumber, jerseyTeamKey, uniqueJerseys, type JerseyHistory } from "@/lib/player/jersey-history";
import { requireSourceAction } from "@/lib/source-policy/policy";

const codes: Record<string, string> = { sdg: "SD", crd: "ARI", rav: "BAL", car: "CAR", gnb: "GB", nwe: "NE", nor: "NO", kan: "KC", sfo: "SF", tam: "TB", rai: "OAK", clt: "IND", oti: "TEN", htx: "HOU", ram: "LAR", jax: "JAX" };
/** Read uniform badges only, never statistical tables or unrelated athletes. */
export function extractPfrJerseys(html: string, fullName: string, teams: string[], sourceUrl: string): JerseyHistory[] {
  requireSourceAction(sourceUrl, "EXTRACT_JERSEY_HISTORY");
  const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "";
  const words = fullName.trim().toLowerCase().split(/\s+/);
  const name = decodeHTML(stripHtml(heading)).toLowerCase();
  if (!words.every(word => name.includes(word))) return [];
  const out: JerseyHistory[] = [];
  for (const anchor of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let link: URL;
    try { link = new URL(decodeHTML(anchor[1]), sourceUrl); } catch { continue; }
    if (link.origin !== new URL(sourceUrl).origin || link.pathname !== "/players/uniform.cgi") continue;
    const number = jerseyNumber(link.searchParams.get("number"));
    const code = link.searchParams.get("team")?.toLowerCase();
    const candidate = code ? codes[code] ?? code.toUpperCase() : "";
    const team = teams.find(team => jerseyTeamKey(team) === jerseyTeamKey(candidate));
    // Requiring the number inside the anchor rejects unrelated navigation links.
    const hexFill = (tag: string) => {
      const hex = /\bfill=["']#([\da-f]{3}|[\da-f]{6})["']/i.exec(tag)?.[1];
      return hex ? `#${hex.length === 3 ? [...hex].map(char => char + char).join("") : hex}`.toUpperCase() : undefined;
    };
    const rects = [...anchor[2].matchAll(/<rect\b[^>]*>/gi)];
    const borderColor = rects[0] && hexFill(rects[0][0]), color = rects[1] && hexFill(rects[1][0]);
    if (number && team && decodeHTML(stripHtml(anchor[2])).trim() === number) out.push({ team, number, sourceUrl, ...(color ? { color } : {}), ...(borderColor ? { borderColor } : {}) });
  }
  return uniqueJerseys(out);
}
