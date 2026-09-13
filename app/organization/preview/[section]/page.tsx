import { notFound } from "next/navigation";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import { PreviewWorkspace } from "@/components/organization/preview/PreviewWorkspace";
import {
  isPreviewSection,
  previewContext,
  previewOptions,
  previewOrganizations,
} from "@/components/organization/preview/preview-data";

export default async function OrganizationWorkspacePreviewPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { section } = await params;
  if (!isPreviewSection(section)) notFound();

  return (
    <OrganizationShell
      context={previewContext}
      organizations={previewOrganizations}
      options={previewOptions}
    >
      <PreviewWorkspace section={section} />
    </OrganizationShell>
  );
}

