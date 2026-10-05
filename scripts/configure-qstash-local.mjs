import { execFile } from "node:child_process";
import { lstat, open, rename, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseEnv } from "dotenv";
import { planQstashEnv, verifyQstashConnection } from "./qstash-env.mjs";

const execFileAsync = promisify(execFile);
const MCP_URL = "https://mcp.upstash.com/mcp";
const RESPONSE_LIMIT = 64 * 1024;
const ENV_LIMIT = 1024 * 1024;

class SetupError extends Error {
  constructor(code) { super(code); this.code = code; }
}

async function readLocalEnvironment(path) {
  const info = await lstat(path).catch(error => error.code === "ENOENT" ? null : Promise.reject(error));
  if (!info) return Buffer.alloc(0);
  if (info.isSymbolicLink() || !info.isFile()) throw new SetupError("unsafe_local_environment_path");
  if (info.size > ENV_LIMIT) throw new SetupError("local_environment_too_large");
  const file = await open(path, "r");
  try {
    const buffer = Buffer.alloc(ENV_LIMIT + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await file.read(buffer, size, buffer.length - size, size);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size > ENV_LIMIT) throw new SetupError("local_environment_too_large");
    const data = buffer.subarray(0, size);
    if (!Buffer.from(data.toString("utf8")).equals(data)) throw new SetupError("unsupported_local_environment_encoding");
    return data;
  } finally { await file.close(); }
}

async function readBoundedResponse(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  let bytes = 0;
  const chunks = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > RESPONSE_LIMIT) throw new SetupError("provider_response_too_large");
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseRpcResponse(text) {
  try { return JSON.parse(text); } catch { /* Streamable HTTP may return SSE. */ }
  for (const event of text.split(/\r?\n\r?\n/)) {
    const data = event.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
    if (!data) continue;
    try {
      const message = JSON.parse(data);
      if (message.result || message.error) return message;
    } catch { /* Never print provider bytes. */ }
  }
  throw new SetupError("invalid_provider_response");
}

/** Credential-bearing helper output stays inside a private subprocess pipe. */
async function savedMcpHeaders() {
  const helper = join(homedir(), ".codex", "helpers", "bltz-upstash-api-headers.mjs");
  let stdout;
  try {
    ({ stdout } = await execFileAsync(process.execPath, [helper, "--for-codex"], {
      windowsHide: true, timeout: 8000, maxBuffer: 16384,
    }));
  } catch { throw new SetupError("saved_account_auth_unavailable"); }
  let headers;
  try { headers = JSON.parse(stdout); } catch { throw new SetupError("saved_account_auth_unavailable"); }
  if (typeof headers?.Authorization !== "string" || !headers.Authorization.startsWith("Bearer ") ||
      headers.Authorization.length > 8192 || /[\r\n]/.test(headers.Authorization)) {
    throw new SetupError("saved_account_auth_unavailable");
  }
  return { Authorization: headers.Authorization, "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
}

/** Same read-only MCP tool as the connector; no publish, schedule or rotation. */
async function fetchRegionalCredentials(region) {
  const headers = await savedMcpHeaders();
  let session;
  async function rpc(message, notification = false) {
    let response;
    try {
      response = await fetch(MCP_URL, {
        method: "POST", headers: { ...headers, ...(session ? { "Mcp-Session-Id": session } : {}) },
        body: JSON.stringify(message), signal: AbortSignal.timeout(15000), redirect: "error",
      });
    } catch { throw new SetupError("provider_connection_unavailable"); }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new SetupError("provider_authorization_failed");
    }
    session ??= response.headers.get("mcp-session-id");
    if (notification) {
      await response.body?.cancel().catch(() => {});
      return;
    }
    const messageResult = parseRpcResponse(await readBoundedResponse(response));
    if (messageResult.error || !messageResult.result) throw new SetupError("provider_tool_failed");
    return messageResult.result;
  }
  const initialization = await rpc({
    jsonrpc: "2.0", id: 1, method: "initialize", params: {
      protocolVersion: "2025-03-26", capabilities: {},
      clientInfo: { name: "bltz-local-qstash-setup", version: "1.0.0" },
    },
  });
  if (typeof initialization.protocolVersion !== "string") throw new SetupError("invalid_provider_response");
  headers["MCP-Protocol-Version"] = initialization.protocolVersion;
  await rpc({ jsonrpc: "2.0", method: "notifications/initialized" }, true);
  const result = await rpc({
    jsonrpc: "2.0", id: 2, method: "tools/call",
    params: { name: "qstash_list_users", arguments: { region, include_credentials: true } },
  });
  if (result.isError) throw new SetupError("runtime_credentials_unavailable");
  let credentials = result.structuredContent;
  if (!credentials) {
    for (const item of result.content ?? []) {
      if (item.type !== "text") continue;
      try { credentials = JSON.parse(item.text); break; } catch { /* Do not print tool output. */ }
    }
  }
  if (!credentials || Array.isArray(credentials)) throw new SetupError("runtime_credentials_unavailable");
  return credentials;
}

export async function main() {
  const args = process.argv.slice(2);
  if (args.length > 2 || args.length && (args.length !== 2 || args[0] !== "--region" || !["us", "eu"].includes(args[1]))) {
    throw new SetupError("invalid_arguments");
  }
  const region = args[1] ?? "us";
  const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
  const envPath = join(workspaceRoot, ".env.local");
  const developmentPath = join(workspaceRoot, ".env.development.local");
  const tempPath = join(workspaceRoot, ".env.qstash-setup.local");
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") throw new SetupError("local_development_only");
  try {
    await Promise.all([".env.local", ".env.qstash-setup.local"].map(name =>
      execFileAsync("git", ["check-ignore", "-q", name], { cwd: workspaceRoot, windowsHide: true })));
  }
  catch { throw new SetupError("local_environment_not_ignored"); }
  const [original, developmentOriginal] = await Promise.all([readLocalEnvironment(envPath), readLocalEnvironment(developmentPath)]);
  const originalText = original.toString("utf8");
  const credentials = await fetchRegionalCredentials(region);
  const plan = planQstashEnv(originalText, credentials, region);
  const proposedEnv = parseEnv(plan.updatedText);
  if (proposedEnv.BLTZ_ANALYTICS_PIPELINE_ENABLED !== "false" || proposedEnv.BLTZ_ANALYTICS_ENVIRONMENT !== "development") {
    throw new SetupError("disabled_development_gate_required");
  }
  // Next.js gives the development-local file and process values precedence.
  // Do not save a connection that a different secret/enablement would shadow.
  for (const overrides of [parseEnv(developmentOriginal.toString("utf8")), process.env]) {
    for (const name of ["QSTASH_URL", "QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY",
      "BLTZ_ANALYTICS_DISPATCH_SECRET", "BLTZ_ANALYTICS_PIPELINE_ENABLED", "BLTZ_ANALYTICS_ENVIRONMENT"]) {
      if (overrides[name] !== undefined && overrides[name] !== proposedEnv[name]) {
        throw new SetupError("higher_precedence_environment_conflict");
      }
    }
  }
  const verification = await verifyQstashConnection(proposedEnv);
  if (verification.status !== "verified") throw new SetupError("runtime_authorization_not_verified");
  async function assertSnapshotUnchanged() {
    const [current, developmentCurrent] = await Promise.all([readLocalEnvironment(envPath), readLocalEnvironment(developmentPath)]);
    if (!current.equals(original) || !developmentCurrent.equals(developmentOriginal)) {
      throw new SetupError("local_environment_changed_during_setup");
    }
  }
  await assertSnapshotUnchanged();
  let createdTemp = false;
  try {
    if (plan.updatedText !== originalText) {
      const file = await open(tempPath, "wx", 0o600);
      createdTemp = true;
      try { await file.writeFile(plan.updatedText, "utf8"); await file.sync(); }
      finally { await file.close(); }
      await assertSnapshotUnchanged();
      await rename(tempPath, envPath);
      createdTemp = false;
    }
    console.log(JSON.stringify({
      status: "configured_and_read_verified", region: verification.region,
      changedNames: plan.changedNames, credentialValuesPrinted: false,
      runtimePipelineEnabled: false, liveDeliveryVerified: false,
      accountMutations: false, secretsFile: ".env.local",
    }));
  } finally {
    if (createdTemp) await unlink(tempPath).catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) {
    const reason = error instanceof SetupError ? error.code : "configuration_rejected";
    console.error(JSON.stringify({ status: "setup_failed", reason, credentialValuesPrinted: false }));
    process.exitCode = 1;
  }
}
