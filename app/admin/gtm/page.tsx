import { GtmOverview } from "@/components/admin/gtm/GtmOverview";
import { getGtmContacts, getGtmMetrics } from "@/lib/gtm/server";

export const metadata = {
  title: "GTM Overview | BLTZ Admin",
  description: "Executive relationship intelligence for authorized BLTZ administrators.",
};

export default async function GtmOverviewPage() {
  const [data, metrics] = await Promise.all([getGtmContacts(), getGtmMetrics()]);
  return <GtmOverview data={data} metrics={metrics} />;
}
