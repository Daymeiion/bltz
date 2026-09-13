import { notFound } from "next/navigation";
import { OrganizationDashboardOverview } from "@/components/organization/OrganizationDashboardOverview";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import type {
  AccessibleOrganization,
  OrganizationContext,
  OrganizationWorkspaceOptions,
} from "@/lib/organization/types";

const PREVIEW_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

const previewContext: OrganizationContext = {
  userId: "22222222-2222-4222-8222-222222222222",
  organization: {
    id: PREVIEW_ORGANIZATION_ID,
    name: "Westlake University Athletics",
    organizationType: "school_athletics",
    status: "approved",
    schoolId: null,
  },
  access: {
    scope: "organization",
    membershipId: "33333333-3333-4333-8333-333333333333",
    role: "organization_admin",
  },
};

const previewOrganizations: AccessibleOrganization[] = [
  { organization: previewContext.organization, access: previewContext.access },
  {
    organization: {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Desert Ridge Athletics",
      organizationType: "club",
      status: "restricted",
      schoolId: null,
    },
    access: {
      scope: "organization",
      membershipId: "55555555-5555-4555-8555-555555555555",
      role: "viewer",
    },
  },
];

const previewOptions: OrganizationWorkspaceOptions = {
  teams: [
    { id: "team-football", name: "Varsity Football", sport: "football" },
    { id: "team-basketball", name: "Women's Basketball", sport: "basketball" },
    { id: "team-track", name: "Track and Field", sport: "track_and_field" },
  ],
  seasons: [
    { id: "season-2026", seasonCode: "2026", sport: "football", status: "active" },
    { id: "season-2025", seasonCode: "2025", sport: "football", status: "completed" },
  ],
};

export default function OrganizationPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <OrganizationShell
      context={previewContext}
      organizations={previewOrganizations}
      options={previewOptions}
    >
      <OrganizationDashboardOverview
        organizationName={previewContext.organization.name}
        organizationId={previewContext.organization.id}
        teamCount={previewOptions.teams.length}
        seasonCount={previewOptions.seasons.length}
        preview
      />
    </OrganizationShell>
  );
}
