import type { ReactNode } from "react";
import { IconArrowDownRight, IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type MetricDeltaProps = {
  value: string;
  direction?: "up" | "down" | "flat";
  sentiment?: "positive" | "negative" | "neutral";
  context: string;
};

export function MetricDelta({ value, direction = "flat", sentiment = "neutral", context }: MetricDeltaProps) {
  const Icon = direction === "up" ? IconArrowUpRight : direction === "down" ? IconArrowDownRight : IconArrowRight;
  const meaning = `${direction.charAt(0).toUpperCase() + direction.slice(1)}, ${sentiment}`;
  return <span className={cn("crm-metric-delta", `crm-metric-delta--${sentiment}`)}><Icon aria-hidden /><span className="sr-only">{meaning}</span><strong>{value}</strong><span>{context}</span></span>;
}

export type KpiCardProps = {
  label: string;
  value?: string;
  timeframe: string;
  definition?: string;
  updatedAt?: string;
  delta?: MetricDeltaProps;
  visual?: ReactNode;
  state?: "default" | "loading" | "unavailable" | "stale";
};

export function KpiCard({ label, value, timeframe, definition, updatedAt, delta, visual, state = "default" }: KpiCardProps) {
  return (
    <article className="crm-kpi-card" aria-busy={state === "loading" || undefined}>
      <div className="crm-kpi-card__heading"><p>{label}</p><span>{timeframe}</span></div>
      {state === "loading" ? (
        <div className="crm-kpi-card__skeleton" aria-label={`${label} is loading`}><span /><span /></div>
      ) : state === "unavailable" ? (
        <p className="crm-kpi-card__unavailable">Metric unavailable</p>
      ) : (
        <>
          <div className="crm-kpi-card__metric"><strong>{value}</strong>{visual ? <div aria-hidden>{visual}</div> : null}</div>
          {delta ? <MetricDelta {...delta} /> : null}
        </>
      )}
      {definition ? <p className="crm-kpi-card__definition">{definition}</p> : null}
      {updatedAt ? <p className={cn("crm-kpi-card__updated", state === "stale" && "crm-kpi-card__updated--stale")}>{state === "stale" ? "Stale · " : "Updated "}{updatedAt}</p> : null}
    </article>
  );
}
