"use client";

import { useState } from "react";
import { IconArrowRight, IconRefresh } from "@tabler/icons-react";
import { Breadcrumb, DateRangeSelector, FilterBar, PageHeader, PillTabs, SearchInput } from "@/components/enterprise-crm/navigation";
import { DataTable, EntityReference, KpiCard, Pagination, Sparkline, StatusBadge, type DataTableSort } from "@/components/enterprise-crm/data";
import { ActivityFeed, ApprovalRow, AssignmentDrawer, AttentionRow, CommentThread, ExecutiveAttentionCard, MemberWorkload, NotificationItem, TaskRow, WorkloadLegend, type AssignmentDrawerState } from "@/components/enterprise-crm/workflow";
import { ActivationSummaryRow, OpportunityRow, PartnerReference, RightsSummary } from "@/components/enterprise-crm/domain";
import { IntelligenceCard, RecommendedAction, SourceIndicator } from "@/components/enterprise-crm/intelligence";
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DataTableSort>({ columnId: "attention", direction: "descending" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerState, setDrawerState] = useState<AssignmentDrawerState>("default");
  const fictionalRows = [
    { id: "preview-1", owner: "Morgan Lee", role: "Rights manager", attention: 4 },
    { id: "preview-2", owner: "Liam Patel", role: "Media manager", attention: 2 },
  ];
  return (
    <div className="crm-system-preview">
      <div className="crm-preview-banner"><strong>Fictional component preview</strong><span>Values and actions demonstrate presentation only. Nothing here is live or persisted.</span></div>
      <Breadcrumb items={[{ label: "Home", href: "/organization" }, { label: "Executive Action Center" }]} />
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
          <KpiCard label="Athletes" value="486" timeframe="Current scope" definition="Authorized athlete records" delta={{ value: "12", direction: "up", sentiment: "positive", context: "since last period" }} visual={<Sparkline values={[12, 18, 15, 23, 29, 31]} label="Fictional athlete record trend" summary="Fictional preview: record count rises across six samples." />} updatedAt="8:42 AM" />
          <KpiCard label="Active Opportunities" value="24" timeframe="Last 30 days" definition="Open opportunities in scope" delta={{ value: "3", direction: "up", sentiment: "neutral", context: "new this period" }} updatedAt="8:40 AM" state="stale" />
          <KpiCard label="Active Activations" timeframe="Current scope" definition="Approved activations in progress" state="loading" />
          <KpiCard label="Revenue YTD" timeframe="Year to date" definition="Requires explicit financial permission" state="unavailable" />
        </div>
      </section>

      <section className="crm-preview-section" aria-labelledby="inventory-preview-title">
        <header className="crm-preview-section__heading"><div><h2 id="inventory-preview-title">Wave 2 component inventory</h2><p>Reusable navigation, responsive data, workflow, domain, and explainable-intelligence contracts.</p></div><div className="crm-preview-drawer-actions"><button type="button" className="crm-button crm-button--primary" onClick={() => { setDrawerState("default"); setDrawerOpen(true); }}>Assign owner</button><button type="button" className="crm-button crm-button--secondary" onClick={() => { setDrawerState("submitting"); setDrawerOpen(true); }}>Processing state</button><button type="button" className="crm-button crm-button--secondary" onClick={() => { setDrawerState("error"); setDrawerOpen(true); }}>Error state</button><button type="button" className="crm-button crm-button--secondary" onClick={() => { setDrawerState("success"); setDrawerOpen(true); }}>Success state</button><button type="button" className="crm-button crm-button--secondary" onClick={() => { setDrawerState("restricted"); setDrawerOpen(true); }}>Restricted state</button></div></header>
        <FilterBar activeCount={search ? 1 : 0} resultSummary="2 fictional members" onReset={() => setSearch("")}><SearchInput value={search} onChange={setSearch} label="Search fictional members" placeholder="Search members" resultCount={2} /><label className="crm-select-field">Workload<select aria-label="Filter fictional workload"><option>All levels</option><option>Needs attention</option></select></label></FilterBar>
        <div className="crm-preview-table-wrap">
          <DataTable caption="Fictional member workload" rows={fictionalRows} rowKey={(row) => row.id} sort={sort} onSort={setSort} columns={[
            { id: "owner", header: "Owner", sortable: true, cell: (row) => <EntityReference label={row.owner} context={row.role} /> },
            { id: "attention", header: "Needs attention", sortable: true, align: "end", cell: (row) => row.attention },
            { id: "status", header: "Status", cell: (row) => <StatusBadge label={row.attention > 2 ? "Review workload" : "Available"} variant={row.attention > 2 ? "attention" : "positive"} /> },
          ]} rowActionLabel={(row) => `View ${row.owner}`} onRowAction={() => undefined} />
          <Pagination page={page} pageCount={3} onPageChange={setPage} label="Fictional member pages" />
        </div>
      </section>

      <div className="crm-preview-wave2-grid">
        <section className="crm-section-container crm-preview-stack" aria-labelledby="domain-preview-title">
          <header className="crm-section-heading"><div><h2 id="domain-preview-title">Domain context</h2><p>Caller-supplied labels avoid inventing source stages or rights rules.</p></div></header>
          <OpportunityRow title="Regional campaign review" context="Fictional Opportunity" partner={<PartnerReference label="Northstar Foods" context="Fictional partner" initials="NF" />} stageLabel="Review" stageVariant="review" value={<span>$45K preview</span>} decisionDate="Aug 29" />
          <ActivationSummaryRow title="Fall launch" context="Fictional Activation" status="In review" statusVariant="review" owner={<EntityReference label="Liam Patel" context="Fictional owner" />} participants={[{ id: "a", label: "Maya Johnson", initials: "MJ" }, { id: "b", label: "Ari Thomas", initials: "AT" }]} due="Sep 4" rights={<StatusBadge label="Rights review" variant="attention" />} />
          <RightsSummary label="Media usage rights" status="Review required" statusVariant="blocked" context="Fictional source evidence requires an authorized decision." reviewer={<EntityReference label="Morgan Lee" context="Fictional reviewer" />} due="Aug 26" />
        </section>
        <IntelligenceCard title="Alumni campaign timing" meaning="recommended" reason="Fictional preview: recent archive engagement may support a timely human review." confidence={78} coverage="4 of 5 fictional sources available" freshness="Updated 18 minutes ago" sources={<><SourceIndicator label="Archive engagement" detail="Fictional verified source" freshness="12 min ago" /><SourceIndicator label="Partner brief" detail="Fictional detected source" freshness="1 hr ago" /></>} impact={<span>Potential audience lift is an estimate, not a verified outcome.</span>} action={<RecommendedAction label="Review analysis" onAction={() => undefined} context="A person must review sources before any downstream action." />} />
      </div>

      <section className="crm-preview-section" aria-labelledby="workflow-preview-title">
        <header className="crm-preview-section__heading"><div><h2 id="workflow-preview-title">Workflow and activity</h2><p>Presentation callbacks only; no business mutation is performed.</p></div></header>
        <WorkloadLegend items={[{ label: "High", count: 1, variant: "high" }, { label: "Medium", count: 2, variant: "medium" }, { label: "Available", count: 3, variant: "low" }, { label: "Delegated", count: 4, variant: "delegated" }]} />
        <TaskRow title="Confirm archive provenance" context="Fictional task" status="Needs review" statusVariant="review" priority="high" due="Aug 26" action={<button type="button" className="crm-button crm-button--secondary">Open</button>} />
        <ApprovalRow title="Campaign approval" context="Fictional approval" approver="Taylor Reed" status="Pending review" due="Aug 29" />
        <div className="crm-preview-wave2-grid"><ActivityFeed items={[{ id: "1", actor: "Morgan Lee", action: "reviewed fictional rights context", timestamp: "Today, 8:42 AM" }, { id: "2", actor: "Liam Patel", action: "accepted a fictional assignment", timestamp: "Yesterday, 4:18 PM" }]} /><CommentThread comments={[{ id: "1", author: "Taylor Reed", context: "Fictional executive", body: "Please confirm the usage window before review.", timestamp: "Today, 8:50 AM" }]} onSubmit={() => undefined} /></div>
        <NotificationItem title="Owner assigned" context="Fictional notification content is permission-safe and links back to its source." timestamp="2 minutes ago" unread action={<button type="button" className="crm-button crm-button--secondary">View</button>} />
      </section>

      <section className="crm-preview-section" aria-labelledby="table-state-title"><header className="crm-preview-section__heading"><div><h2 id="table-state-title">Responsive list states</h2><p>Loading, filtered-empty, error, and restricted surfaces preserve non-inferable behavior.</p></div></header><div className="crm-preview-state-grid"><DataTable caption="Fictional records" columns={[]} rows={[]} rowKey={() => "loading"} state="loading" /><DataTable caption="Restricted fictional records" columns={[]} rows={[]} rowKey={() => "restricted"} state="restricted" /></div></section>

      <AssignmentDrawer open={drawerOpen} onOpenChange={setDrawerOpen} sourceTitle="Fictional media rights review" sourceContext={<span>Women’s Basketball · preview only</span>} members={[{ id: "morgan", label: "Morgan Lee", context: "Fictional rights manager" }, { id: "liam", label: "Liam Patel", context: "Fictional media manager" }]} priorities={[{ value: "caller-option-a", label: "Caller-supplied priority A" }, { value: "caller-option-b", label: "Caller-supplied priority B" }]} state={drawerState} errorMessage="Fictional recoverable conflict. The source changed; review and try again." onSubmit={() => setDrawerState("success")} />

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
