import { GtmPlayerProspectsWorkspace } from "@/components/admin/gtm/GtmPlayerProspectsWorkspace";
import { parseGtmPlayerProspectFilters } from "@/lib/gtm/player-prospect-contract";
import { getGtmPlayerProspects } from "@/lib/gtm/player-prospects";

export const metadata = {
  title: "Player Prospecting | BLTZ Admin",
  description: "Build private GTM athlete cohorts from the canonical Player Master.",
};

export default async function GtmPlayerProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseGtmPlayerProspectFilters(await searchParams);
  const data = await getGtmPlayerProspects(filters);
  return <GtmPlayerProspectsWorkspace data={data} />;
}

