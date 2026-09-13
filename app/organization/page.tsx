import { redirect } from "next/navigation";
import { listAccessibleOrganizations } from "@/lib/organization/context";

export default async function OrganizationEntryPage() {
  const result = await listAccessibleOrganizations();

  if (!result.ok) {
    redirect(`/auth/login?next=${encodeURIComponent("/organization")}`);
  }

  const firstOrganization = result.organizations.at(0);
  if (!firstOrganization) redirect("/organization/select");

  redirect(`/organization/${firstOrganization.organization.id}/dashboard`);
}

