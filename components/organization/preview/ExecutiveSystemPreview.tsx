"use client";

import { useState } from "react";
import { IconArrowRight, IconRefresh } from "@tabler/icons-react";
import { DateRangeSelector, PageHeader, PillTabs } from "@/components/enterprise-crm/navigation";
import { KpiCard, StatusBadge } from "@/components/enterprise-crm/data";
import { AttentionRow, ExecutiveAttentionCard, MemberWorkload } from "@/components/enterprise-crm/workflow";
import { EmptyState, ErrorState, FilteredEmptyState, LoadingState, ProcessingState, RestrictedState, SuccessState } from "@/components/enterprise-crm/states";

const tabs = [
  { id: "overview", label: "Executive Overview" },
  { id: "athletics", label: "Athletics" },
  { id: "revenue", label: "Revenue" },
  { id: "engagement", label: "Engagement" },
  { id: "performance", label: "Performance" },
  { id: "pipeline", label: "Pipeline", disabled: true },
] as const;

export function ExecutiveSystemPreview() {
  const [activeTab, setActiveTab] = useState("overview");
  const [range, setRange] = useState("30d");
  return (
    <div className="crm-system-preview">
      <div className="crm-preview-banner"><strong>Fictional component preview</strong><span>Values and actions demonstrate presentation only. Nothing here is live or persisted.</span></div>
      <PageHeader
        eyebrow="All Athletics · Executive"
        title="Executive Action Center"
        description="Review material signals, delegate accountable work, and track source resolution across the organization."
        meta={<><StatusBadge label="Current scope" variant="informational" /><span>Westlake University Athletics</span></>}
        actions={<DateRangeSelector value={range} onChange={setRange} options={[{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "ytd", label: "Year to date" }]} />}
      />
      <PillTabs items={tabs} currentId={activeTab} onChange={setActiveTab} label="Executive Action Center views" />

      <section className="crm-preview-section" aria-labelledby="summary-preview-title">
        <header className="crm-preview-section__heading"><div><h2 id="summary-preview-title">Summary component states</h2><p>Stable geometry distinguishes current, loading, stale, and unavailable values.</p></div><span className="crm-preview-label">{tabs.find((tab) => tab.id === activeTab)?.label}</span></header>
        <div className="crm-preview-kpi-grid">
          <KpiCard label="Athletes" value="486" timeframe="Current scope" definition="Authorized athlete records" delta={{ value: "12", direction: "up", sentiment: "positive", context: "since last period" }} updatedAt="8:42 AM" />
          <KpiCard label="Active Opportunities" value="24" timeframe="Last 30 days" definition="Open opportunities in scope" delta={{ value: "3", direction: "up", sentiment: "neutral", context: "new this period" }} updatedAt="8:40 AM" state="stale" />
          <KpiCard label="Active Activations" timeframe="Current scope" definition="Approved activations in progress" state="loading" />
          <KpiCard label="Revenue YTD" timeframe="Year to date" definition="Requires explicit financial permission" state="unavailable" />
        </div>
      </section>

      <div className="crm-preview-module-grid">
        <ExecutiveAttentionCard count={2} action={<button type="button" className="crm-button crm-button--secondary">View all<IconArrowRight aria-hidden /></button>}>
          <AttentionRow title="Media rights review" context="Women's Basketball · Maya Johnson" status="Needs review" statusVariant="review" priority="high" due="Aug 26" />
          <AttentionRow title="Opportunity approval" context="Football · Regional partner" status="Approval required" statusVariant="attention" priority="medium" due="Aug 29" />
        </ExecutiveAttentionCard>
        <MemberWorkload action={<button type="button" className="crm-button crm-button--primary">Assign</button>} members={[
          { id: "1", name: "Morgan Lee", context: "Rights manager", initials: "ML", assigned: 14, capacityPercent: 88, band: "high" },
          { id: "2", name: "Liam Patel", context: "Media manager", initials: "LP", assigned: 8, capacityPercent: 58, band: "medium" },
          { id: "3", name: "Emma Carter", context: "NIL operations", initials: "EC", assigned: 3, capacityPercent: 28, band: "low" },
        ]} />
      </div>

      <section className="crm-preview-section" aria-labelledby="state-preview-title">
        <header className="crm-preview-section__heading"><div><h2 id="state-preview-title">Shared surface states</h2><p>Each state explains what happened without substituting a fabricated zero.</p></div></header>
        <div className="crm-preview-state-grid">
          <LoadingState title="Loading current scope" />
          <EmptyState title="No assignments yet" description="Assignments created for this scope will appear here." />
          <FilteredEmptyState onReset={() => undefined} />
          <ErrorState onRetry={() => undefined} />
          <RestrictedState />
          <ProcessingState title="Assigning owner" />
          <SuccessState title="Owner assigned" description="The source record and Action Center are now up to date." />
        </div>
      </section>

      <button type="button" className="crm-button crm-button--secondary crm-preview-focus-target"><IconRefresh aria-hidden />Focus evidence target</button>
    </div>
  );
}
