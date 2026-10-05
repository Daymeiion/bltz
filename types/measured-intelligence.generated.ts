// GENERATED from isolated executable PostgreSQL migration catalog. Not a deployed schema attestation.
export type MeasuredIntelligenceJson = string | number | boolean | null | { [key: string]: MeasuredIntelligenceJson | undefined } | MeasuredIntelligenceJson[];

export interface MeasuredIntelligenceTables {
  analytics_delivery_batches: {
    Row: {
      id: string;
      environment: string;
      state: string;
      event_count: number;
      byte_count: number;
      publish_attempts: number;
      worker_attempts: number;
      publish_lease_token: string | null;
      publish_lease_until: string | null;
      worker_lease_token: string | null;
      worker_lease_until: string | null;
      next_attempt_at: string;
      message_id: string | null;
      last_error_code: string | null;
      created_at: string;
      updated_at: string;
      acknowledged_at: string | null;
    };
    Insert: {
      id?: string;
      environment: string;
      state?: string;
      event_count: number;
      byte_count: number;
      publish_attempts?: number;
      worker_attempts?: number;
      publish_lease_token?: string | null;
      publish_lease_until?: string | null;
      worker_lease_token?: string | null;
      worker_lease_until?: string | null;
      next_attempt_at?: string;
      message_id?: string | null;
      last_error_code?: string | null;
      created_at?: string;
      updated_at?: string;
      acknowledged_at?: string | null;
    };
    Update: {
      id?: string;
      environment?: string;
      state?: string;
      event_count?: number;
      byte_count?: number;
      publish_attempts?: number;
      worker_attempts?: number;
      publish_lease_token?: string | null;
      publish_lease_until?: string | null;
      worker_lease_token?: string | null;
      worker_lease_until?: string | null;
      next_attempt_at?: string;
      message_id?: string | null;
      last_error_code?: string | null;
      created_at?: string;
      updated_at?: string;
      acknowledged_at?: string | null;
    };
  };
  analytics_delivery_outbox: {
    Row: {
      environment: string;
      event_id: string;
      analytics_event_id: string;
      envelope: MeasuredIntelligenceJson;
      payload_hash: string;
      batch_id: string | null;
      accepted_at: string;
    };
    Insert: {
      environment: string;
      event_id: string;
      analytics_event_id: string;
      envelope: MeasuredIntelligenceJson;
      payload_hash: string;
      batch_id?: string | null;
      accepted_at?: string;
    };
    Update: {
      environment?: string;
      event_id?: string;
      analytics_event_id?: string;
      envelope?: MeasuredIntelligenceJson;
      payload_hash?: string;
      batch_id?: string | null;
      accepted_at?: string;
    };
  };
  intelligence_engine_runs: {
    Row: {
      id: string;
      environment: string;
      player_id: string;
      moment_id: string | null;
      subject_kind: string;
      subject_key: string;
      scope_key: string;
      feature_version: string;
      rule_version: string;
      as_of: string;
      computed_at: string;
      event_watermark: string;
      input_revision: number;
      input_snapshot_hash: string;
      input_snapshot: MeasuredIntelligenceJson;
      features: MeasuredIntelligenceJson;
      signals: MeasuredIntelligenceJson;
      status: string;
      created_at: string;
    };
    Insert: {
      id: string;
      environment: string;
      player_id: string;
      moment_id?: string | null;
      subject_kind: string;
      subject_key: string;
      scope_key: string;
      feature_version: string;
      rule_version: string;
      as_of: string;
      computed_at: string;
      event_watermark: string;
      input_revision: number;
      input_snapshot_hash: string;
      input_snapshot: MeasuredIntelligenceJson;
      features: MeasuredIntelligenceJson;
      signals: MeasuredIntelligenceJson;
      status?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      environment?: string;
      player_id?: string;
      moment_id?: string | null;
      subject_kind?: string;
      subject_key?: string;
      scope_key?: string;
      feature_version?: string;
      rule_version?: string;
      as_of?: string;
      computed_at?: string;
      event_watermark?: string;
      input_revision?: number;
      input_snapshot_hash?: string;
      input_snapshot?: MeasuredIntelligenceJson;
      features?: MeasuredIntelligenceJson;
      signals?: MeasuredIntelligenceJson;
      status?: string;
      created_at?: string;
    };
  };
  intelligence_feature_snapshots: {
    Row: {
      environment: string;
      subject_key: string;
      scope_key: string;
      feature_version: string;
      run_id: string;
      player_id: string;
      moment_id: string | null;
      as_of: string;
      event_watermark: string;
      computed_at: string;
      input_revision: number;
      revision: number;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      environment: string;
      subject_key: string;
      scope_key: string;
      feature_version: string;
      run_id: string;
      player_id: string;
      moment_id?: string | null;
      as_of: string;
      event_watermark: string;
      computed_at: string;
      input_revision: number;
      revision?: number;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      environment?: string;
      subject_key?: string;
      scope_key?: string;
      feature_version?: string;
      run_id?: string;
      player_id?: string;
      moment_id?: string | null;
      as_of?: string;
      event_watermark?: string;
      computed_at?: string;
      input_revision?: number;
      revision?: number;
      created_at?: string;
      updated_at?: string;
    };
  };
}

export interface MeasuredIntelligenceFunctions {
  accept_analytics_delivery_event: { Args: {
    p_event: MeasuredIntelligenceJson;
    p_envelope: MeasuredIntelligenceJson;
  }; Returns: MeasuredIntelligenceJson };
  acquire_analytics_delivery_batch: { Args: {
    p_batch_id: string;
    p_environment: string;
    p_lease_token: string;
    p_lease_seconds: number;
  }; Returns: MeasuredIntelligenceJson };
  get_analytics_delivery_batch: { Args: {
    p_batch_id: string;
    p_environment: string;
  }; Returns: MeasuredIntelligenceJson };
  lease_analytics_delivery_batch: { Args: {
    p_environment: string;
    p_limit: number;
    p_byte_cap: number;
    p_lease_token: string;
    p_lease_seconds: number;
  }; Returns: MeasuredIntelligenceJson };
  mark_analytics_delivery_published: { Args: {
    p_batch_id: string;
    p_lease_token: string;
    p_message_id: string;
  }; Returns: boolean };
  release_analytics_delivery_publish: { Args: {
    p_batch_id: string;
    p_lease_token: string;
    p_error_code: string;
  }; Returns: boolean };
  settle_analytics_delivery_batch: { Args: {
    p_batch_id: string;
    p_lease_token: string;
    p_outcome: string;
    p_error_code: string;
  }; Returns: boolean };
  store_intelligence_feature_run: { Args: {
    p_run: MeasuredIntelligenceJson;
  }; Returns: boolean };
}
