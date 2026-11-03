import type { ReactNode } from "react";
import { IconArrowRight, IconCalendar } from "@tabler/icons-react";
import { PriorityBadge, StatusBadge, type Priority, type StatusVariant } from "../data";
import { ErrorState, LoadingState, RestrictedState, type SurfaceStateKind, SurfaceState } from "../states";

export type AttentionRowProps = {
  title: string;
  context: string;
  status: string;
  statusVariant: StatusVariant;
  priority: Priority;
  due?: string;
  action?: ReactNode;
};

export function AttentionRow({ title, context, status, statusVariant, priority, due, action }: AttentionRowProps) {
  return (
    <article className="crm-attention-row">
      <div className="crm-attention-row__signal" aria-hidden />
      <div className="crm-attention-row__copy"><strong>{title}</strong><span>{context}</span></div>
      <div className="crm-attention-row__badges"><StatusBadge label={status} variant={statusVariant} /><PriorityBadge priority={priority} /></div>
      {due ? <span className="crm-attention-row__due"><IconCalendar aria-hidden />{due}</span> : null}
      <div className="crm-attention-row__action">{action ?? <button type="button" className="crm-icon-button" aria-label={`Open ${title}`}><IconArrowRight aria-hidden /></button>}</div>
    </article>
  );
}

export function ExecutiveAttentionCard({
  count,
  children,
  action,
  state = "default",
}: {
  count?: number;
  children?: ReactNode;
  action?: ReactNode;
  state?: "default" | SurfaceStateKind;
}) {
  let body = children;
  if (state === "loading") body = <LoadingState title="Loading attention items" />;
  else if (state === "error") body = <ErrorState />;
  else if (state === "restricted") body = <RestrictedState />;
  else if (state !== "default") body = <SurfaceState kind={state} title={state === "success" ? "Attention item resolved" : state === "processing" ? "Updating attention" : "No attention items"} description={state === "success" ? "The source update is reflected in this scope." : state === "processing" ? "The source change is being applied." : "There is nothing requiring action in this scope."} />;

  return (
    <section className="crm-section-container" aria-labelledby="executive-attention-title">
      <header className="crm-section-heading">
        <div><div className="crm-section-heading__line"><h2 id="executive-attention-title">Executive Attention</h2>{typeof count === "number" ? <span className="crm-count-badge">{count}</span> : null}</div><p>Material items that need an authorized decision or owner.</p></div>
        {action}
      </header>
      <div className="crm-attention-list">{body}</div>
    </section>
  );
}
