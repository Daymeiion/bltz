/** Editorial and interview links belong in news; directories and social posts do not. */
export function isNewsArticleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (/\/(?:stats|roster|wiki)(?:\/|$)/i.test(url.pathname)) return false;
    if (/(?:^|\.)(?:alchetron\.com|gettyimages\.com|facebook\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com)$/i.test(url.hostname)) return false;
    if (/(?:^|\.)247sports\.com$/i.test(url.hostname) && /^\/player\//i.test(url.pathname)) return false;
    return true;
  } catch { return false; }
}
