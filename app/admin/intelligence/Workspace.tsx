import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./intelligence.module.css";

export function IntelligenceWorkspace({ view, context, children }: { view: "findings" | "athlete" | "example"; context: { q?: string; athlete?: string; asOf?: string }; children: ReactNode }) {
  const tabs = [{ key: "findings", label: "Findings" }, { key: "athlete", label: "Career workspace" }] as const;
  return <div className={styles.workspace}><header className={styles.header}><div><span className={styles.eyebrow}>BLTZ / Private research</span><h1>Intelligence Lab</h1><p>Athlete identity, sourced history, and opportunities worth reviewing.</p></div><span className={styles.workspaceLabel}>Internal intelligence console</span></header><nav className={styles.viewNav} aria-label="Intelligence views">{tabs.map((tab, index) => { const params = new URLSearchParams({ view: tab.key }); for (const [key, value] of Object.entries(context)) if (value) params.set(key, value); return <Link key={tab.key} href={`/admin/intelligence?${params}`} aria-current={view === tab.key ? "page" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{tab.label}</Link>; })}</nav>{children}</div>;
}
