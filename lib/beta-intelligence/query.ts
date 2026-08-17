import "server-only";

import type { BetaIntelligenceReadModel } from "./contracts";
import { betaIntelligenceFixture } from "./fixtures";

/**
 * UI boundary for Agent 1's server-side aggregate contract.
 * Replace this fixture return with the approved query/RPC without changing the page.
 */
export async function getBetaIntelligenceDashboard(): Promise<BetaIntelligenceReadModel> {
  return betaIntelligenceFixture;
}
