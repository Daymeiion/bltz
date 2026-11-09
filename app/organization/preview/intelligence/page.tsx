import { redirect } from "next/navigation";
import { requireTemplateAccess } from "@/lib/enterprise-crm/pilot/template-access";

export default async function OrganizationIntelligencePreviewPage() {
  await requireTemplateAccess("/organization/preview/intelligence");
  redirect("/organization/preview/intelligence/p1");
}
