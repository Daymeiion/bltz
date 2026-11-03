import { notFound } from "next/navigation";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import { AthleteIntelligence } from "@/components/organization/pilot/AthleteIntelligence";
import { previewActivations, previewAthleteFile, previewContext, previewMedia, previewOptions, previewOrganizations, previewReach, previewRoster, previewTheme } from "@/components/organization/pilot/preview-data";

export default async function OrganizationAthletePreviewPage({ params }: { params: Promise<{ playerId: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { playerId } = await params;
  const file = previewAthleteFile(playerId);
  if (!file) notFound();

  return (
    <OrganizationShell context={previewContext} organizations={previewOrganizations} options={previewOptions} previewTheme={previewTheme}>
      <AthleteIntelligence
        organizationId={previewContext.organization.id}
        schoolName={previewContext.organization.name}
        file={file}
        initialActivations={previewActivations.filter((row) => row.playerId === playerId)}
        initialReach={previewReach[playerId] ?? []}
        initialMedia={previewMedia[playerId] ?? []}
        canManage
        roster={previewRoster.players}
        contactEmail={playerId === "p1" ? "marcus@halefitness.example" : null}
        profileBaseHref="/organization/preview/intelligence"
        preview
      />
    </OrganizationShell>
  );
}
