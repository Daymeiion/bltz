// lib/fetch/cleanFetch.ts
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export async function fetchAndClean(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "bltz-awards-bot/1.0" } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const text = article?.textContent || dom.window.document.body.textContent || "";
  // cap to keep tokens reasonable
  return text.slice(0, 60000);
}
