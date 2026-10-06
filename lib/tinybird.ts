import { Tinybird } from "@tinybirdco/sdk";
import {
  bltzEventsDevelopment, bltzEventsDeduplicated, bltzEventsBatchReconciliation, bltzEventsSubjectCounts, bltzEventsFeatureEvents,
  bltzEventsProduction, bltzEventsProductionDeduplicated, bltzEventsProductionBatchReconciliation, bltzEventsProductionSubjectCounts, bltzEventsProductionFeatureEvents,
  bltzPreviewSprintCounts, bltzPreviewSprintProductionCounts,
} from "./analytics/delivery/tinybird-definitions";

/**
 * Tinybird Forward infrastructure entry point, loaded by the SDK CLI.
 *
 * Environment-isolated definitions deduplicate logical events before counts.
 * Deploy development and production resources deliberately; importing definitions
 * neither provisions resources nor enables runtime delivery.
 * Construction is lazy: importing this file neither authenticates nor fetches.
 * Application code must use the server-only ./tinybird-client entry point.
 */
// Include-mode SDK discovery scans direct exports, not the client registry.
export {
  bltzEventsDevelopment, bltzEventsDeduplicated, bltzEventsBatchReconciliation, bltzEventsSubjectCounts, bltzEventsFeatureEvents,
  bltzEventsProduction, bltzEventsProductionDeduplicated, bltzEventsProductionBatchReconciliation, bltzEventsProductionSubjectCounts, bltzEventsProductionFeatureEvents,
  bltzPreviewSprintCounts, bltzPreviewSprintProductionCounts,
} from "./analytics/delivery/tinybird-definitions";
export const tinybird = new Tinybird({
  datasources: { bltzEventsDevelopment, bltzEventsProduction },
  pipes: {
    bltzEventsDeduplicated, bltzEventsBatchReconciliation, bltzEventsSubjectCounts, bltzEventsFeatureEvents,
    bltzEventsProductionDeduplicated, bltzEventsProductionBatchReconciliation, bltzEventsProductionSubjectCounts, bltzEventsProductionFeatureEvents,
    bltzPreviewSprintCounts, bltzPreviewSprintProductionCounts,
  },
});
