// Preview imports commonly contain YouTube page URLs rather than video files.
export function previewVideoSource(value: string | null) {
  try {
    const url = new URL(value ?? "");
    if (url.protocol !== "https:" && url.protocol !== "http:") return { playbackUrl: null, embedUrl: null };
    const host = url.hostname.replace(/^www\./, "");
    const id = host === "youtu.be" ? url.pathname.slice(1)
      : ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
        ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
        : null;
    if (id && /^[\w-]{11}$/.test(id)) {
      return { playbackUrl: null, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    return { playbackUrl: /\.(mp4|webm|ogg|m4v)$/i.test(url.pathname) ? url.href : null, embedUrl: null };
  } catch {
    return { playbackUrl: null, embedUrl: null };
  }
}
