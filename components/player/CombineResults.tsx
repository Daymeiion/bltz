import { combineEventLabel, combineMetricInfo, combineMetricKeys, combineValue, type CombineResult } from "@/lib/player/combine";

export function CombineResults({ results, displayFont, monoFont, accent }: { results: CombineResult[]; displayFont: string; monoFont: string; accent: string }) {
  const recorded = results.filter(event => event.measurements.length > 0);
  const events = recorded.length ? recorded : [null];
  const safeSource = (value?: string | null) => {
    try { const url = new URL(value ?? ""); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
  };
  return <div className="space-y-5">{events.map(event => <section key={event?.id ?? "pending"} aria-label={event ? `${combineEventLabel(event)} results` : "Combine results pending"}>
    {event && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      <h3 style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 800, color: accent }}>{combineEventLabel(event)}</h3>
      <div className="flex flex-wrap gap-3">{event.timing !== "not_recorded" && <span>{event.timing === "official" ? "Official timing" : "Unofficial timing"}</span>}{safeSource(event.sourceUrl) && <a className="underline" href={safeSource(event.sourceUrl)!} target="_blank" rel="noopener noreferrer">Event source</a>}</div>
    </div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>{combineMetricKeys.filter((metric, index) => index < 7 || event?.measurements.some(item => item.metric === metric)).map(metric => {
      const field = combineMetricInfo[metric], measurement = event?.measurements.find(item => item.metric === metric);
      const source = measurement && safeSource(measurement.sourceUrl || event?.sourceUrl);
      return <div key={metric} style={{ minHeight: 106, borderRadius: 12, padding: "13px 8px", background: "#0F1424", border: "1px solid #1E2640", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 7 }}>
        <div style={{ fontFamily: displayFont, fontWeight: 900, fontSize: 27, lineHeight: 1, color: "#fff" }}>{measurement ? combineValue(metric, measurement.value) : "—"}</div>
        <div style={{ fontFamily: monoFont, fontSize: 8, letterSpacing: ".1em", color: accent }}>{measurement ? metric === "broad_jump" ? "FT / IN" : field.unit : "PENDING"}</div>
        <div style={{ fontFamily: monoFont, fontSize: 7.5, letterSpacing: ".08em", color: "rgba(255,255,255,.6)", textTransform: "uppercase", lineHeight: 1.25 }}>{field.label}</div>
        {source && <a href={source} target="_blank" rel="noopener noreferrer" className="text-[10px] underline" aria-label={`${field.label} source for ${combineEventLabel(event!)}`}>Source</a>}
      </div>;
    })}</div>
  </section>)}</div>;
}
