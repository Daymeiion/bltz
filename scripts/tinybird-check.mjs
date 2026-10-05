import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const config = JSON.parse(await readFile(new URL("../tinybird.config.json", import.meta.url), "utf8"));

if (config.devMode !== "branch") {
  throw new Error("Tinybird development must use Cloud Branch mode.");
}

// The pinned SDK's internal generator avoids credential interpolation. This
// offline tool is not an application API; recheck it when upgrading the SDK.
const { buildFromInclude } = await import("../node_modules/@tinybirdco/sdk/dist/generator/index.js");
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  throw new Error("Network access is disabled during the Tinybird offline check.");
};

try {
  const result = await buildFromInclude({ includePaths: config.include, cwd });
  console.log(JSON.stringify({ status: "offline_validated", devMode: config.devMode, resources: result.stats }));
} finally {
  globalThis.fetch = originalFetch;
}
