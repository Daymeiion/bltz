import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconLock, IconMinus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type StatusVariant = "positive" | "neutral" | "informational" | "attention" | "review" | "restricted" | "blocked" | "inactive";

const statusIcons = {
  positive: IconCircleCheck,
  neutral: IconMinus,
  informational: IconInfoCircle,
  attention: IconAlertTriangle,
  review: IconAlertTriangle,
  restricted: IconLock,
  blocked: IconAlertTriangle,
  inactive: IconMinus,
};

export function StatusBadge({ label, variant = "neutral" }: { label: string; variant?: StatusVariant }) {
  const Icon = statusIcons[variant];
  return <span className={cn("crm-badge", `crm-badge--${variant}`)}><Icon aria-hidden />{label}</span>;
}

export type Priority = "high" | "medium" | "low" | "delegated";

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cn("crm-priority", `crm-priority--${priority}`)}><span aria-hidden />{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>;
}
