import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function BuilderSection({ title, description, count, children }: {
  title: string;
  description: string;
  count?: number;
  children: ReactNode;
}) {
  return <details className="group/builder rounded-xl border bg-card">
    <summary className="flex min-h-20 cursor-pointer list-none items-center gap-4 p-4 hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00] [&::-webkit-details-marker]:hidden sm:p-5">
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{title}{count !== undefined && <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">{count}</span>}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronDown aria-hidden="true" className="size-5 shrink-0 group-open/builder:rotate-180" />
    </summary>
    <div className="space-y-4 border-t p-4 sm:p-5">{children}</div>
  </details>;
}
