import { GtmImportWorkspace } from "@/components/admin/gtm/GtmImportWorkspace";

export const metadata = {
  title: "GTM Imports | BLTZ Admin",
  description: "Review and approve canonical Player Master and LinkedIn connection imports.",
};

export const maxDuration = 300;

export default function GtmImportsPage() {
  return <GtmImportWorkspace />;
}
