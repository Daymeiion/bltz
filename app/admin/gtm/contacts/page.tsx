import { GtmContactsWorkspace } from "@/components/admin/gtm/GtmContactsWorkspace";
import { getGtmContacts, getGtmMetrics } from "@/lib/gtm/server";

export const metadata = {
  title: "GTM Contacts | BLTZ Admin",
  description: "Private relationship intelligence for authorized BLTZ administrators.",
};

export default async function GtmContactsPage({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const { contact } = await searchParams;
  const [data, metrics] = await Promise.all([getGtmContacts(), getGtmMetrics()]);
  return <GtmContactsWorkspace data={data} metrics={metrics} initialContactId={contact ?? null} />;
}
