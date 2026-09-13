import { GtmContactsWorkspace } from "@/components/admin/gtm/GtmContactsWorkspace";
import { getGtmContacts, getGtmMetrics } from "@/lib/gtm/server";

import { parseGtmMetricsPeriod, gtmMetricsSince } from "@/lib/gtm/metrics-period";

export const metadata = {
  title: "GTM Contacts | BLTZ Admin",
  description: "Private relationship intelligence for authorized BLTZ administrators.",
};

export default async function GtmContactsPage({ searchParams }: { searchParams: Promise<{ contact?: string; period?: string }> }) {
  const { contact, period } = await searchParams;
  const metricsPeriod = parseGtmMetricsPeriod(period);
  const [data, metrics] = await Promise.all([getGtmContacts(), getGtmMetrics(gtmMetricsSince(metricsPeriod))]);
  return <GtmContactsWorkspace data={data} metrics={metrics} initialContactId={contact ?? null} metricsPeriod={metricsPeriod} />;
}
