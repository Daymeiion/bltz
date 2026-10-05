export function safeSourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?(::1\]?|::ffff:|f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:))/i.test(url.hostname)) return null;
    if ([...url.searchParams.keys()].some(key => /key|token|secret|signature|credential|auth/i.test(key))) return null;
    if (url.hostname === "api.sportradar.com") return null;
    return url.href;
  } catch { return null; }
}

export function confidenceLabel(value: number | null): string {
  return value === null ? "Confidence not recorded" : `${Math.round(value * 100)}% confidence (0–100 scale)`;
}

export function scalarStatistics(stats: Record<string, unknown>): [string, string][] {
  const rows: [string, string][] = [];
  function visit(value: Record<string, unknown>, prefix = "", depth = 0) {
    for (const [key, item] of Object.entries(value)) {
      if (rows.length >= 30) break;
      const label = prefix ? `${prefix} / ${key}` : key;
      if (typeof item === "number" && Number.isFinite(item)) rows.push([label, String(item)]);
      else if (typeof item === "string" && item.length < 120 && !/url|key|token|secret|email/i.test(key)) rows.push([label, item]);
      else if (item && typeof item === "object" && !Array.isArray(item) && depth < 2) visit(item as Record<string, unknown>, label, depth + 1);
    }
  }
  visit(stats);
  return rows;
}
