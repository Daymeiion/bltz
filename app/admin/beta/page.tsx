import { BetaIntelligenceDashboard } from "@/components/admin/beta/BetaIntelligenceDashboard";
import { getBetaIntelligenceDashboard } from "@/lib/beta-intelligence/query";

export const metadata = {
  title: "Beta Intelligence | BLTZ Admin",
  description: "Private athlete beta learning and engagement dashboard.",
};

export default async function BetaIntelligencePage() {
  const data = await getBetaIntelligenceDashboard();
  return <BetaIntelligenceDashboard data={data} />;
}
