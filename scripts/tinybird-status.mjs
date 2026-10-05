import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFiles } from "@tinybirdco/sdk/cli/config";

/** @param {unknown} value */
function record(value) {
  return value && typeof value === "object" ? /** @type {Record<string, unknown>} */ (value) : {};
}

/** @param {Record<string, unknown>} object @param {string} key */
function textField(object, key) {
  return typeof object[key] === "string" ? object[key] : null;
}

/** Only allowlisted fields are printed: SDK info includes complete tokens.
 * @param {unknown} value
 */
export function summarizeInfo(value) {
  const info = record(value);
  const cloud = record(info.cloud);
  const project = record(info.project);
  const branch = record(info.branch);
  return {
    workspace: { name: textField(cloud, "workspaceName"), id: textField(cloud, "workspaceId"),
      apiHost: textField(cloud, "apiHost"), dashboardUrl: textField(cloud, "dashboardUrl") },
    project: { devMode: textField(project, "devMode"), gitBranch: textField(project, "gitBranch"),
      tinybirdBranch: textField(project, "tinybirdBranch"), isMainBranch: project.isMainBranch === true },
    branch: info.branch ? { name: textField(branch, "name"), id: textField(branch, "id"),
      dashboardUrl: textField(branch, "dashboardUrl") } : null,
  };
}

/** @param {Record<string, string | undefined>} env */
export function missingCredentials(env) {
  return ["TINYBIRD_TOKEN", "TINYBIRD_URL"].filter(name => !env[name]?.trim());
}

async function main() {
  const cwd = fileURLToPath(new URL("../", import.meta.url));
  loadEnvFiles(cwd);
  const missing = missingCredentials(process.env);
  if (missing.length) {
    console.error(`Tinybird connection pending: configure ${missing.join(" and ")} in .env.local. No authenticated request was made.`);
    process.exitCode = 1;
    return;
  }

  const cli = fileURLToPath(new URL("../node_modules/@tinybirdco/sdk/bin/tinybird.js", import.meta.url));
  try {
    const { stdout } = await promisify(execFile)(process.execPath, [cli, "info", "--json"], {
      cwd, windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024,
      env: { ...process.env, TINYBIRD_DEBUG: "" },
    });
    console.log(JSON.stringify(summarizeInfo(JSON.parse(stdout)), null, 2));
  } catch {
    // Never forward raw stdout/stderr or API bodies from the SDK subprocess.
    console.error("Tinybird status failed. Check the workspace token, regional API URL, and connectivity; credentials and raw provider output were withheld.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
