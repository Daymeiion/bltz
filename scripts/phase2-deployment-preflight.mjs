import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs, parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;
const LEGACY_ADMIN_BACKFILL_REASON =
  "Phase 2 migration: preserve approved legacy admin access before removing profiles.role authorization.";
const CAREER_TABLES = [
  "seasons",
  "team_seasons",
  "athlete_team_seasons",
  "athlete_season_stats",
  "sports_events",
  "sports_event_teams",
  "sports_event_athletes",
];

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in the selected environment file`);
  return value;
}

export function duplicateValues(rows, field) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[field]?.trim().toLowerCase();
    if (!value) continue;
    const matches = grouped.get(value) ?? [];
    matches.push(row.id);
    grouped.set(value, matches);
  }
  return [...grouped.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([value, ids]) => ({ value, ids }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

export function buildTeamMappingRows(teams, players) {
  const playerCounts = new Map();
  for (const player of players) {
    if (!player.team_id) continue;
    playerCounts.set(player.team_id, (playerCounts.get(player.team_id) ?? 0) + 1);
  }

  return teams
    .map((team) => ({
      team_id: team.id,
      team_name: team.name,
      team_slug: team.slug,
      school_id: team.school_id ?? "",
      current_organization_id: team.organization_id ?? "",
      current_player_count: playerCounts.get(team.id) ?? 0,
      proposed_organization_id: "",
      confidence: "",
      review_notes: "",
    }))
    .sort((a, b) => a.team_name.localeCompare(b.team_name));
}

function csvCell(value) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

async function fetchAll(client, table, columns, configure = (query) => query) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = client
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    query = configure(query);
    const { data, error } = await query;
    if (error) {
      throw new Error(`${table} read failed: ${error.code ?? "unknown"} ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchOptionalAll(client, table, columns, configure) {
  try {
    return {
      available: true,
      rows: await fetchAll(client, table, columns, configure),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("PGRST205") || message.includes("does not exist")) {
      return { available: false, rows: [] };
    }
    throw error;
  }
}

async function exactCount(client, table) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

export async function runPreflight({ env, stage }) {
  if (stage !== "pre" && stage !== "post") {
    throw new Error("--stage must be either pre or post");
  }

  const url = required(env, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = required(env, "SUPABASE_SERVICE_ROLE_KEY");
  const expectedProjectRef = required(env, "PHASE2_EXPECTED_PROJECT_REF");
  const expectedAdminId = required(env, "PHASE2_EXPECTED_SUPER_ADMIN_USER_ID");
  const projectRef = new URL(url).hostname.split(".", 1)[0];
  if (projectRef !== expectedProjectRef) {
    throw new Error(
      `Refusing preflight: target ${projectRef} does not match PHASE2_EXPECTED_PROJECT_REF`,
    );
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const legacyAdmins = await fetchAll(
    client,
    "profiles",
    "id,role",
    (query) => query.eq("role", "admin"),
  );
  if (legacyAdmins.length !== 1 || legacyAdmins[0].id !== expectedAdminId) {
    throw new Error(
      "Admin gate failed: profiles.role=admin must contain exactly the reviewed expected Auth user",
    );
  }

  const existingSuperAdmins = await fetchOptionalAll(
    client,
    "platform_role_assignments",
    "id,user_id,role,assigned_at,revoked_at,assignment_reason",
    (query) => query.eq("role", "super_admin"),
  );
  const expectedHistory = existingSuperAdmins.rows.filter(
    (assignment) => assignment.user_id === expectedAdminId,
  );
  const expectedActiveBefore = expectedHistory.some((assignment) => !assignment.revoked_at);
  const expectedWillBeBackfilled = expectedHistory.length === 0;
  if (!expectedActiveBefore && !expectedWillBeBackfilled) {
    throw new Error(
      "Admin gate failed: expected admin has revoked super_admin history and migration 00002 will not reactivate it",
    );
  }
  const unexpectedActiveBefore = existingSuperAdmins.rows.filter(
    (assignment) => assignment.user_id !== expectedAdminId && !assignment.revoked_at,
  );
  if (unexpectedActiveBefore.length > 0) {
    throw new Error("Admin gate failed: unexpected active super_admin assignments already exist");
  }

  const teamColumns = stage === "post"
    ? "id,name,slug,school_id,organization_id"
    : "id,name,slug,school_id";
  const [teams, players] = await Promise.all([
    fetchAll(client, "teams", teamColumns),
    fetchAll(client, "players", "id,team_id"),
  ]);
  const teamMapping = buildTeamMappingRows(teams, players);
  const report = {
    stage,
    projectRef,
    generatedAt: new Date().toISOString(),
    adminGate: {
      expectedUserId: expectedAdminId,
      legacyAdminIds: legacyAdmins.map((profile) => profile.id),
      assignmentTableAvailable: existingSuperAdmins.available,
      expectedActiveBefore,
      expectedWillBeBackfilled,
      projectedActiveAfterMigration: 1,
    },
    teams: {
      total: teams.length,
      mapped: stage === "post"
        ? teams.filter((team) => team.organization_id).length
        : null,
      unmapped: stage === "post"
        ? teams.filter((team) => !team.organization_id).length
        : null,
      withPlayers: teamMapping.filter((team) => team.current_player_count > 0).length,
      duplicateNames: duplicateValues(teams, "name"),
      duplicateSlugs: duplicateValues(teams, "slug"),
    },
    playerAssociations: {
      total: players.length,
      withoutTeam: players.filter((player) => !player.team_id).length,
    },
    teamMapping,
  };

  if (stage === "post") {
    const [assignments, organizations, memberships, backfillAudits, careerCounts] = await Promise.all([
      fetchAll(
        client,
        "platform_role_assignments",
        "id,user_id,role,assigned_at,revoked_at,assignment_reason",
        (query) => query.eq("role", "super_admin"),
      ),
      exactCount(client, "organizations"),
      exactCount(client, "organization_memberships"),
      fetchAll(
        client,
        "audit_logs",
        "id,entity_id,created_at,new_values,request_metadata",
        (query) => query.eq("action", "platform_role.backfilled"),
      ),
      Promise.all(CAREER_TABLES.map(async (table) => [table, await exactCount(client, table)])),
    ]);
    const activeAssignments = assignments.filter((assignment) => !assignment.revoked_at);
    const expectedAssignment = activeAssignments.find(
      (assignment) => assignment.user_id === expectedAdminId,
    );
    if (!expectedAssignment) {
      throw new Error("Post-deploy admin gate failed: expected active super_admin assignment is missing");
    }
    const unexpectedActiveAssignments = activeAssignments.filter(
      (assignment) => assignment.user_id !== expectedAdminId,
    );
    if (unexpectedActiveAssignments.length > 0) {
      throw new Error("Post-deploy admin gate failed: unexpected active super_admin assignments exist");
    }
    const backfillAuditRequired =
      expectedAssignment.assignment_reason === LEGACY_ADMIN_BACKFILL_REASON;
    const backfillAuditFound = backfillAudits.some((audit) =>
      audit.entity_id === expectedAssignment.id
      && audit.new_values?.user_id === expectedAdminId
      && audit.new_values?.role === "super_admin"
      && audit.request_metadata?.migration
        === "20260818000002_phase2_legacy_admin_super_admin_transition"
    );
    if (backfillAuditRequired && !backfillAuditFound) {
      throw new Error("Post-deploy admin gate failed: expected super_admin backfill audit is missing");
    }

    report.adminGate.activeSuperAdmins = activeAssignments.map((assignment) => ({
      userId: assignment.user_id,
      assignmentId: assignment.id,
      assignedAt: assignment.assigned_at,
    }));
    report.adminGate.unexpectedActiveSuperAdminIds = [];
    report.adminGate.backfillAuditRequired = backfillAuditRequired;
    report.adminGate.backfillAuditFound = backfillAuditFound;
    report.postMigration = {
      organizations,
      memberships,
      careerCounts: Object.fromEntries(careerCounts),
    };
  }

  return report;
}

async function main() {
  const { values } = parseArgs({
    options: {
      env: { type: "string", default: ".env.staging.local" },
      stage: { type: "string", default: "pre" },
      "team-csv": { type: "boolean", default: false },
    },
  });
  const envPath = resolve(values.env);
  const env = parseEnv(readFileSync(envPath, "utf8"));
  const report = await runPreflight({ env, stage: values.stage });
  if (values["team-csv"]) {
    console.log(toCsv(report.teamMapping));
    return;
  }
  console.log(`PHASE2_DEPLOYMENT_PREFLIGHT=${JSON.stringify(report)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
