"use client";

import type { PreviewSection } from "./preview-data";
import { PlayersWorkspace } from "./PlayersWorkspace";
import { MediaWorkspace } from "./MediaWorkspace";
import { AgreementsWorkspace, ReportsWorkspace } from "./DocumentWorkspaces";
import { OperationsWorkspace } from "./OperationsWorkspaces";

export function PreviewWorkspace({ section }: { section: PreviewSection }) {
  const normalized = section === "athletes" ? "players" : section === "analytics" ? "reports" : section;

  return (
    <div className="min-h-[calc(100dvh-8rem)] py-6 text-[#0d213f] sm:py-8">
      <div className="mx-auto max-w-[1600px]">
        {normalized === "players" ? <PlayersWorkspace /> : null}
        {normalized === "media" ? <MediaWorkspace /> : null}
        {normalized === "agreements" ? <AgreementsWorkspace /> : null}
        {normalized === "reports" ? <ReportsWorkspace /> : null}
        {normalized === "rights" || normalized === "approvals" || normalized === "campaigns" || normalized === "attribution" || normalized === "messages" || normalized === "revenue" || normalized === "settings" ? (
          <OperationsWorkspace section={normalized} />
        ) : null}
      </div>
    </div>
  );
}
