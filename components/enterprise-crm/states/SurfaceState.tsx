import type { ReactNode } from "react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconFilterOff,
  IconInbox,
  IconLoader2,
  IconLock,
  IconRefresh,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type SurfaceStateKind = "loading" | "empty" | "filtered-empty" | "error" | "restricted" | "processing" | "success";

const icons = {
  loading: IconLoader2,
  empty: IconInbox,
  "filtered-empty": IconFilterOff,
  error: IconAlertTriangle,
  restricted: IconLock,
  processing: IconLoader2,
  success: IconCircleCheck,
};

export type SurfaceStateProps = {
  kind: SurfaceStateKind;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
};

export function SurfaceState({ kind, title, description, action, compact = false }: SurfaceStateProps) {
  const Icon = icons[kind];
  const live = kind === "error" ? "assertive" : kind === "processing" || kind === "success" ? "polite" : undefined;
  return (
    <section
      className={cn("crm-surface-state", compact && "crm-surface-state--compact", `crm-surface-state--${kind}`)}
      aria-live={live}
      aria-busy={kind === "loading" || kind === "processing" || undefined}
    >
      <Icon className={kind === "loading" || kind === "processing" ? "crm-spin" : undefined} aria-hidden />
      <div><h3>{title}</h3><p>{description}</p>{action ? <div className="crm-surface-state__action">{action}</div> : null}</div>
    </section>
  );
}

export function LoadingState({ title = "Loading workspace" }: { title?: string }) {
  return <SurfaceState kind="loading" title={title} description="Current-scope data is being authorized and prepared." />;
}

export function EmptyState({ title, description, action }: Omit<SurfaceStateProps, "kind">) {
  return <SurfaceState kind="empty" title={title} description={description} action={action} />;
}

export function FilteredEmptyState({ onReset }: { onReset?: () => void }) {
  return <SurfaceState kind="filtered-empty" title="No matching results" description="Adjust or clear the active filters to see more records." action={onReset ? <button type="button" className="crm-button crm-button--secondary" onClick={onReset}><IconRefresh aria-hidden />Reset filters</button> : undefined} />;
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return <SurfaceState kind="error" title="This section could not load" description="The rest of the workspace is still available. Retry this section when ready." action={onRetry ? <button type="button" className="crm-button crm-button--secondary" onClick={onRetry}><IconRefresh aria-hidden />Retry</button> : undefined} />;
}

export function RestrictedState() {
  return <SurfaceState kind="restricted" title="Access restricted" description="You do not have permission to view this information in the current scope." />;
}

export function ProcessingState({ title = "Processing update" }: { title?: string }) {
  return <SurfaceState kind="processing" title={title} description="Keep this workspace open while the requested change is completed." />;
}

export function SuccessState({ title = "Update complete", description = "The source record now reflects this change." }: { title?: string; description?: string }) {
  return <SurfaceState kind="success" title={title} description={description} />;
}
