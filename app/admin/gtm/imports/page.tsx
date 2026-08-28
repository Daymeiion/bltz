import { GtmImportWorkspace } from "@/components/admin/gtm/GtmImportWorkspace";

export const metadata = {
  title: "GTM Imports | BLTZ Admin",
  description: "Review and approve LinkedIn connection imports for BLTZ GTM.",
};

export default function GtmImportsPage() {
  return <GtmImportWorkspace />;
}
