import { notFound, redirect } from "next/navigation";
import { resolveOrganizationContext } from "@/lib/organization/context";

export default async function OrganizationLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}>) {
  const { organizationId } = await params;
  const result = await resolveOrganizationContext(organizationId);

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      const nextPath = `/organization/${encodeURIComponent(organizationId)}/dashboard`;
      redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
    }

    notFound();
  }

  return children;
}
