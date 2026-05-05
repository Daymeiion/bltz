import { fetchHtml, stripHtml } from "../fetch";
import type { PlayerIdentityInput, ScraperResult } from "../types";

/**
 * ESPN scraper. ESPN player pages render most stats server-side. We use
 * their public site search to find a candidate page, then parse a few
 * obvious bits.
 *
 * NOTE: ESPN aggressively rate-limits bots. We cap at 6s and degrade
 * gracefully — the LLM gate will treat ESPN as missing rather than
 * incorrect when blocked.
 */

const STAT_RE = /HT[:\s]+(\d)['']\s*(\d{1,2})/i;
const WT_RE = /WT[:\s]+(\d{2,3})/i;
const GAMES_RE = /GP[:\s]+(\d{1,3})/i;

export async function scrapeESPN(
  identity: PlayerIdentityInput,
): Promise<ScraperResult> {
  const q = encodeURIComponent(`${identity.full_name} ${identity.school ?? ""}`.trim());
  const searchUrl = `https://www.espn.com/search/results?q=${q}`;
  const search = await fetchHtml(searchUrl, { timeoutMs: 6000 });
  if (!search.ok) return { source: "espn", ok: false, reason: search.reason };

  const slugMatch = search.html.match(/href="(https:\/\/www\.espn\.com\/[a-z]+\/player\/_\/id\/[0-9]+\/[a-z0-9-]+)"/i);
  if (!slugMatch) return { source: "espn", ok: false, reason: "not_found" };

  const playerUrl = slugMatch[1];
  const player = await fetchHtml(playerUrl, { timeoutMs: 6000 });
  if (!player.ok) return { source: "espn", ok: false, reason: player.reason };

  const text = stripHtml(player.html);
  const ht = text.match(STAT_RE);
  const wt = text.match(WT_RE);
  const gp = text.match(GAMES_RE);

  return {
    source: "espn",
    ok: true,
    facts: {
      height_in: ht ? parseInt(ht[1], 10) * 12 + parseInt(ht[2], 10) : undefined,
      weight_lbs: wt ? parseInt(wt[1], 10) : undefined,
      games_played: gp ? parseInt(gp[1], 10) : undefined,
    },
    urls: [playerUrl],
  };
}
