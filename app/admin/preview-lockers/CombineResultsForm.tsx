"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BuilderSection } from "./BuilderSection";
import { combineEventLabel, combineMetricInfo, combineMetricKeys, type CombineMetric, type CombineResult } from "@/lib/player/combine";

export default function CombineResultsForm({ value, onChange }: { value: CombineResult[]; onChange: (value: CombineResult[]) => void }) {
  const update = (id: string, patch: Partial<CombineResult>) => onChange(value.map(event => event.id === id ? { ...event, ...patch } : event));
  function measurement(event: CombineResult, metric: CombineMetric, input: string) {
    const existing = event.measurements.find(item => item.metric === metric);
    update(event.id, { measurements: input === "" ? event.measurements.filter(item => item.metric !== metric)
      : existing ? event.measurements.map(item => item.metric === metric ? { ...item, value: Number(input) } : item)
        : [...event.measurements, { metric, value: Number(input), sourceUrl: null }] });
  }
  return <BuilderSection title="Combine & Pro Day results" count={value.length} description="Enter sourced measurements. Saved results stay intact during scraper refreshes.">
    <p className="text-sm text-muted-foreground">Keep Combine and Pro Day results in separate events. Leave unknown measurements blank. An event source can cover every measurement; add individual sources below when they differ. Save the draft to display these results in the Locker’s Measurables section.</p>
    {!value.length && <p className="text-sm">No results recorded yet.</p>}
    {value.map((event, index) => <section key={event.id} className="min-w-0 space-y-4 rounded-lg border p-4" aria-label={`Measurement event ${index + 1}`}>
      <h3 className="font-semibold">{combineEventLabel(event)}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Event type<select className="rounded border bg-background p-2" aria-label={`Event ${index + 1} type`} value={event.eventType} onChange={e => update(event.id, { eventType: e.target.value as CombineResult["eventType"] })}><option value="combine">Combine</option><option value="pro_day">Pro Day</option></select></label>
        <label className="grid gap-2 text-sm">Event year (optional)<Input aria-label={`Event ${index + 1} year`} type="number" min={1950} max={2100} value={event.year ?? ""} onChange={e => update(event.id, { year: e.target.value === "" ? null : Number(e.target.value) })} /></label>
        <label className="grid gap-2 text-sm sm:col-span-2">Event source link<Input aria-label={`Event ${index + 1} source`} type="url" maxLength={2048} placeholder="https://…" value={event.sourceUrl ?? ""} onChange={e => update(event.id, { sourceUrl: e.target.value || null })} /></label>
        <label className="grid gap-2 text-sm">Timing label<select className="rounded border bg-background p-2" aria-label={`Event ${index + 1} timing`} value={event.timing} onChange={e => update(event.id, { timing: e.target.value as CombineResult["timing"] })}><option value="not_recorded">Not specified</option><option value="official">Official</option><option value="unofficial">Unofficial</option></select></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{combineMetricKeys.map(metric => {
        const field = combineMetricInfo[metric], item = event.measurements.find(entry => entry.metric === metric);
        return metric === "broad_jump" ? <div key={metric} className="space-y-2 text-sm"><p>Broad jump</p><div className="grid grid-cols-2 gap-2"><label className="grid gap-1">Feet<Input aria-label={`Event ${index + 1} broad jump feet`} type="number" min={0} max={20} step={1} value={item ? Math.floor(item.value / 12) : ""} onChange={e => measurement(event, metric, e.target.value === "" ? "" : String(Number(e.target.value) * 12 + (item?.value ?? 0) % 12))} /></label><label className="grid gap-1">Inches<Input aria-label={`Event ${index + 1} broad jump inches`} type="number" min={0} max={11.999} step={0.125} value={item ? Number((item.value % 12).toFixed(3)) : ""} onChange={e => measurement(event, metric, e.target.value === "" ? "" : String(Math.floor((item?.value ?? 0) / 12) * 12 + Number(e.target.value)))} /></label></div></div>
          : <label key={metric} className="grid gap-2 text-sm">{field.label} ({field.unit.toLowerCase()})<Input aria-label={`Event ${index + 1} ${field.label}`} type="number" min={field.min} max={field.max} step={field.step} value={item?.value ?? ""} onChange={e => measurement(event, metric, e.target.value)} /></label>;
      })}</div>
      {event.measurements.length > 0 && <details className="rounded border p-3"><summary className="cursor-pointer text-sm">Individual measurement sources (optional)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{event.measurements.map(item => <label key={item.metric} className="grid gap-1 text-sm">{combineMetricInfo[item.metric].label} source<Input aria-label={`Event ${index + 1} ${combineMetricInfo[item.metric].label} source`} type="url" maxLength={2048} placeholder="Use event source" value={item.sourceUrl ?? ""} onChange={e => update(event.id, { measurements: event.measurements.map(entry => entry.metric === item.metric ? { ...entry, sourceUrl: e.target.value || null } : entry) })} /></label>)}</div></details>}
      <Button type="button" variant="outline" onClick={() => onChange(value.filter(item => item.id !== event.id))}>Remove event {index + 1}</Button>
    </section>)}
    <Button type="button" variant="outline" disabled={value.length >= 10} onClick={() => onChange([...value, { id: crypto.randomUUID(), eventType: "combine", year: null, timing: "not_recorded", sourceUrl: null, measurements: [] }])}>Add Combine or Pro Day event</Button>
  </BuilderSection>;
}
