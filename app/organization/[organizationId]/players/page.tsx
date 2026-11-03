import { redirect } from "next/navigation";

/** Players moved into Intelligence. */
export default async function OrganizationPlayersPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  redirect(`/organization/${encodeURIComponent(organizationId)}/intelligence`);
}
