import { defineDatasource, definePipe, engine, node, p, t } from "@tinybirdco/sdk";

/** Definitions are CLI-safe: no credentials, fetches, or server runtime imports. */
export const bltzEventsDevelopment = defineDatasource("bltz_events_development_v1", {
  description: "Isolated development BLTZEvent journal; raw replays may duplicate and must be deduplicated before aggregation.",
  schema: {
    event_id: t.string(), schema_version: t.uint8(), event_name: t.string(), event_version: t.string(),
    occurred_at: t.dateTime64(3, "UTC"), received_at: t.dateTime64(3, "UTC"),
    environment: t.string(), surface: t.string(), producer: t.string(), actor_kind: t.string(),
    measurement_basis: t.string(), audience_eligible: t.uint8(),
    subject_player_id: t.string().nullable(), moment_id: t.string().nullable(),
    asset_id: t.string().nullable(), asset_model: t.string().nullable(), session_id: t.string().nullable(),
    scope_key: t.string(), source_channel: t.string(), properties_json: t.string(),
    delivery_batch_id: t.string(), payload_hash: t.string(),
  },
  engine: engine.mergeTree({ sortingKey: ["environment", "event_id", "received_at"] }),
});

/** Tuple argMax preserves genuine nulls; conflicting logical IDs fail closed. */
export const DEDUPLICATED_EVENTS_SQL = `
SELECT environment, event_id,
  argMax(tuple(event_name, event_version, occurred_at, subject_player_id, moment_id,
    asset_id, asset_model, session_id, scope_key, audience_eligible, source_channel,
    surface, measurement_basis, properties_json, schema_version, producer, actor_kind), tuple(received_at, payload_hash)) AS envelope,
  max(received_at) AS received_at,
  uniqExact(payload_hash) AS payload_revisions,
  count() AS physical_rows
FROM bltz_events_development_v1
WHERE environment = 'development'
GROUP BY environment, event_id
`;

export const bltzEventsDeduplicated = definePipe("bltz_events_deduplicated_v1", {
  description: "One logical event per environment/event UUID, before any feature count; conflicting payload hashes excluded.",
  nodes: [node({ name: "logical_events", sql: DEDUPLICATED_EVENTS_SQL }), node({
    name: "deduplicated", sql: `SELECT event_id, environment, envelope.1 AS event_name,
      envelope.3 AS occurred_at, received_at, envelope.4 AS subject_player_id,
      envelope.9 AS scope_key, envelope.10 AS audience_eligible, physical_rows
      FROM logical_events WHERE payload_revisions = 1`,
  })],
  output: { event_id: t.string(), environment: t.string(), event_name: t.string(),
    occurred_at: t.dateTime64(3, "UTC"), received_at: t.dateTime64(3, "UTC"),
    subject_player_id: t.string().nullable(), scope_key: t.string(), audience_eligible: t.uint8(), physical_rows: t.uint64() },
  endpoint: true,
});

export const bltzEventsBatchReconciliation = definePipe("bltz_events_batch_reconciliation_v1", {
  description: "Read-only exact logical IDs and content fingerprints for one durable development batch.",
  params: { batch_id: p.string() },
  nodes: [node({ name: "reconciled_batch", sql: `
    SELECT event_id, payload_hash, count() AS physical_rows
    FROM bltz_events_development_v1
    WHERE environment = 'development' AND delivery_batch_id = {{String(batch_id)}}
    GROUP BY event_id, payload_hash
    LIMIT 201
  ` })],
  output: { event_id: t.string(), payload_hash: t.string(), physical_rows: t.uint64() },
  endpoint: true,
});

export const bltzEventsSubjectCounts = definePipe("bltz_events_subject_counts_v1", {
  description: "Development eligible tab-session counts, never returning people, deduplicated before aggregation.",
  params: { subject_player_id: p.string(), window_start: p.string(), window_end: p.string() },
  nodes: [node({ name: "logical_events", sql: DEDUPLICATED_EVENTS_SQL }), node({
    name: "subject_counts", sql: `
    SELECT envelope.1 AS event_name, count() AS event_count,
      uniqExactIf(envelope.8, isNotNull(envelope.8)) AS tab_session_count,
      max(received_at) AS event_watermark
    FROM logical_events
    WHERE payload_revisions = 1 AND envelope.4 = {{String(subject_player_id)}}
      AND envelope.9 = 'public_audience' AND envelope.10 = 1
      AND envelope.3 >= parseDateTime64BestEffort({{String(window_start)}})
      AND envelope.3 < parseDateTime64BestEffort({{String(window_end)}})
    GROUP BY event_name
  ` })],
  output: { event_name: t.string(), event_count: t.uint64(), tab_session_count: t.uint64(), event_watermark: t.dateTime64(3, "UTC") },
  endpoint: true,
});

export const bltzEventsFeatureEvents = definePipe("bltz_events_feature_events_v1", {
  description: "Bounded development feature input, deduplicated before filtering, explicit cap sentinel at 5001 rows.",
  params: { subject_player_id: p.string(), window_start: p.string(), window_end: p.string(), max_events: p.int32().optional(5001) },
  nodes: [node({ name: "logical_events", sql: DEDUPLICATED_EVENTS_SQL }), node({ name: "feature_events", sql: `
    SELECT event_id, environment, envelope.1 AS event_name, envelope.2 AS event_version,
      envelope.3 AS occurred_at, received_at, envelope.4 AS subject_player_id,
      envelope.5 AS moment_id, envelope.6 AS asset_id, envelope.7 AS asset_model,
      envelope.8 AS session_id, envelope.9 AS scope_key, envelope.10 AS audience_eligible,
      envelope.11 AS source_channel, envelope.12 AS surface, envelope.13 AS measurement_basis,
      envelope.14 AS properties_json, envelope.15 AS schema_version,
      envelope.16 AS producer, envelope.17 AS actor_kind
    FROM logical_events
    WHERE payload_revisions = 1 AND envelope.4 = {{String(subject_player_id)}}
      AND envelope.9 = 'public_audience'
      AND envelope.3 >= parseDateTime64BestEffort({{String(window_start)}})
      AND envelope.3 < parseDateTime64BestEffort({{String(window_end)}})
    ORDER BY occurred_at, event_id
    LIMIT least(greatest({{Int32(max_events, 5001)}}, 1), 5001)
  ` })],
  output: {
    event_id: t.string(), environment: t.string(), event_name: t.string(), event_version: t.string(),
    occurred_at: t.dateTime64(3, "UTC"), received_at: t.dateTime64(3, "UTC"),
    subject_player_id: t.string().nullable(), moment_id: t.string().nullable(), asset_id: t.string().nullable(),
    asset_model: t.string().nullable(), session_id: t.string().nullable(), scope_key: t.string(),
    audience_eligible: t.uint8(), source_channel: t.string(), surface: t.string(), measurement_basis: t.string(),
    properties_json: t.string(), schema_version: t.uint8(), producer: t.string(), actor_kind: t.string(),
  },
  endpoint: true,
});

/** Private preview activity never contributes to public audience or athlete-value counts. */
export const bltzPreviewSprintCounts = definePipe("bltz_preview_sprint_counts_v1", {
  description: "One preview's event/media counts and tab sessions after logical deduplication; not people or verified claims.",
  params: { preview_id: p.string(), window_start: p.string(), window_end: p.string() },
  nodes: [node({ name: "logical_events", sql: DEDUPLICATED_EVENTS_SQL }), node({ name: "preview_counts", sql: `
    SELECT JSONExtractString(envelope.14, 'preview_id') AS preview_id,
      JSONExtractString(envelope.14, 'event_kind') AS event_kind,
      JSONExtractString(envelope.14, 'media_id') AS media_id,
      JSONExtractInt(envelope.14, 'progress') AS progress,
      count() AS event_count,
      uniqExactIf(envelope.8, isNotNull(envelope.8)) AS tab_session_count,
      max(received_at) AS event_watermark
    FROM logical_events
    WHERE payload_revisions = 1 AND envelope.2 = 'preview-sprint-v1'
      AND envelope.9 = 'preview_sprint' AND envelope.10 = 0 AND envelope.12 = 'preview'
      AND envelope.17 != 'internal'
      AND (envelope.17 != 'operational' OR (envelope.13 = 'server_workflow'
        AND JSONExtractString(envelope.14, 'event_kind') IN ('sent', 'booking_confirmed', 'walkthrough_completed', 'referred_prepared')))
      AND JSONExtractString(envelope.14, 'preview_id') = {{String(preview_id)}}
      AND envelope.3 >= parseDateTime64BestEffort({{String(window_start)}})
      AND envelope.3 < parseDateTime64BestEffort({{String(window_end)}})
    GROUP BY preview_id, event_kind, media_id, progress
    ORDER BY event_kind, media_id, progress
    LIMIT 1001
  ` })],
  output: { preview_id: t.string(), event_kind: t.string(), media_id: t.string(), progress: t.int32(),
    event_count: t.uint64(), tab_session_count: t.uint64(), event_watermark: t.dateTime64(3, "UTC") },
  endpoint: true,
});

/** Production resources are physically separate; these definitions never provision or backfill. */
function productionSql(sql: string): string {
  return sql.replaceAll("bltz_events_development_v1", "bltz_events_production_v1").replaceAll("'development'", "'production'");
}
function productionNodes(nodes: readonly { _name: string; sql: string; description?: string }[]) {
  return nodes.map(item => node({ name: item._name, sql: productionSql(item.sql), description: item.description }));
}
export const PRODUCTION_DEDUPLICATED_EVENTS_SQL = productionSql(DEDUPLICATED_EVENTS_SQL);
export const bltzEventsProduction = defineDatasource("bltz_events_production_v1", {
  ...bltzEventsDevelopment.options,
  description: "Isolated production BLTZEvent journal; logical deduplication precedes aggregation. Default-off application gate is separate.",
});
export const bltzEventsProductionDeduplicated = definePipe("bltz_events_production_deduplicated_v1", {
  ...bltzEventsDeduplicated.options,
  description: "Production logical event identity and conflicting-content exclusion, before aggregation.",
  nodes: productionNodes(bltzEventsDeduplicated.options.nodes),
});
export const bltzEventsProductionBatchReconciliation = definePipe("bltz_events_production_batch_reconciliation_v1", {
  ...bltzEventsBatchReconciliation.options,
  description: "Read-only exact logical IDs/content for a durable production batch; never releases quarantine.",
  nodes: productionNodes(bltzEventsBatchReconciliation.options.nodes),
});
export const bltzEventsProductionSubjectCounts = definePipe("bltz_events_production_subject_counts_v1", {
  ...bltzEventsSubjectCounts.options,
  description: "Production eligible tab-session counts after logical deduplication, never people.",
  nodes: productionNodes(bltzEventsSubjectCounts.options.nodes),
});
export const bltzEventsProductionFeatureEvents = definePipe("bltz_events_production_feature_events_v1", {
  ...bltzEventsFeatureEvents.options,
  description: "Bounded production feature inputs, with the explicit 5001-row cap sentinel.",
  nodes: productionNodes(bltzEventsFeatureEvents.options.nodes),
});
export const bltzPreviewSprintProductionCounts = definePipe("bltz_preview_sprint_production_counts_v1", {
  ...bltzPreviewSprintCounts.options,
  description: "Production private-preview counts, logically deduplicated and excluded from commercial audience metrics.",
  nodes: productionNodes(bltzPreviewSprintCounts.options.nodes),
});
