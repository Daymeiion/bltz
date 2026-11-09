import { notFound } from "next/navigation";
import { requireTemplateAccess } from "@/lib/enterprise-crm/pilot/template-access";
import { reachHistory } from "@/lib/enterprise-crm/pilot/suggestions";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import { AthleteIntelligence } from "@/components/organization/pilot/AthleteIntelligence";
import { previewActivations, previewAthleteFile, previewContext, previewMedia, previewOptions, previewOrganizations, previewReach, previewRoster, previewArt, previewTheme } from "@/components/organization/pilot/preview-data";

export const metadata = { title: "School template", robots: { index: false, follow: false } };

export default async function OrganizationAthletePreviewPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  await requireTemplateAccess(`/organization/preview/intelligence/${encodeURIComponent(playerId)}`);
  const file = previewAthleteFile(playerId);
  if (!file) notFound();

  return (
    <OrganizationShell context={previewContext} organizations={previewOrganizations} options={previewOptions} previewTheme={previewTheme} previewArt={previewArt}>
      <AthleteIntelligence
        organizationId={previewContext.organization.id}
        schoolName={previewContext.organization.name}
        file={file}
        initialActivations={previewActivations.filter((row) => row.playerId === playerId)}
        initialReach={previewReach[playerId] ?? []}
        initialMedia={previewMedia[playerId] ?? []}
        schoolHistory={reachHistory(previewActivations)}
        canManage
        roster={previewRoster.players}
        contactEmail={playerId === "p1" ? "marcus@halefitness.example" : playerId === "p5" ? "Dante@bltz.me" : null}
        profileBaseHref="/organization/preview/intelligence"
        preview
      />
    </OrganizationShell>
  );
}
