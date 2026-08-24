import type { CSSProperties, ReactNode } from "react";
import { EntityReference } from "../data";

export type WorkloadBand = "high" | "medium" | "low" | "delegated";

export type WorkloadMember = {
  id: string;
  name: string;
  context: string;
  initials?: string;
  assigned: number;
  capacityPercent: number;
  band: WorkloadBand;
};

export function MemberWorkload({ members, action }: { members: readonly WorkloadMember[]; action?: ReactNode }) {
  const summary = members.reduce<Record<WorkloadBand, number>>((result, member) => {
    result[member.band] += 1;
    return result;
  }, { high: 0, medium: 0, low: 0, delegated: 0 });

  return (
    <section className="crm-section-container" aria-labelledby="member-workload-title">
      <header className="crm-section-heading"><div><h2 id="member-workload-title">Member Workload</h2><p>Assignment distribution for members visible in this scope.</p></div>{action}</header>
      <div className="crm-workload-summary" aria-label={`Workload summary: ${summary.high} high, ${summary.medium} medium, ${summary.low} low, ${summary.delegated} delegated`}>
        {(Object.keys(summary) as WorkloadBand[]).map((band) => <span key={band} className={`crm-workload-key crm-workload-key--${band}`}><i aria-hidden />{band}<strong>{summary[band]}</strong></span>)}
      </div>
      <div className="crm-workload-list">
        {members.map((member) => (
          <article key={member.id} className="crm-workload-row">
            <EntityReference label={member.name} context={member.context} initials={member.initials} />
            <div className="crm-workload-row__meter">
              <span><strong>{member.assigned}</strong> assigned</span>
              <span className="crm-workload-track" role="progressbar" aria-label={`${member.name} capacity`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={member.capacityPercent}>
                <i className={`crm-workload-fill crm-workload-fill--${member.band}`} style={{ "--crm-workload-value": `${member.capacityPercent}%` } as CSSProperties} />
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
