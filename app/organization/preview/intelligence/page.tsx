import { notFound, redirect } from "next/navigation";

export default function OrganizationIntelligencePreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  redirect("/organization/preview/intelligence/p1");
}
