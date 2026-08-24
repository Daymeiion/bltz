import type { ReactNode } from "react";

export type EntityReferenceProps = {
  label: string;
  context?: string;
  initials?: string;
  mark?: ReactNode;
  status?: ReactNode;
};

export function EntityReference({ label, context, initials, mark, status }: EntityReferenceProps) {
  return (
    <span className="crm-entity-reference">
      <span className="crm-entity-reference__mark" aria-hidden>{mark ?? initials ?? label.slice(0, 2).toUpperCase()}</span>
      <span className="crm-entity-reference__copy"><strong>{label}</strong>{context ? <span>{context}</span> : null}</span>
      {status ? <span className="crm-entity-reference__status">{status}</span> : null}
    </span>
  );
}
