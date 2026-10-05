import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "dotenv";
import { verifyQstashConnection } from "./qstash-env.mjs";

/** Private dotenv loading, redacted output and GET /v2/keys only. No writes or publishing.
 * @param {{rootPath?:string, environment?:Record<string,string|undefined>, fetchImpl?:typeof fetch,
 * readFileImpl?:(path:string, encoding:'utf8')=>Promise<string>, write?:(text:string)=>void}} [options]
 */
export async function qstashStatusMain(options = {}) {
  const rootPath = options.rootPath ?? fileURLToPath(new URL("../", import.meta.url));
  const readText = options.readFileImpl ?? readFile;
  const write = options.write ?? (text => { process.stdout.write(text); });
  try {
    /** @type {Record<string,string|undefined>} */
    let env = {};
    for (const name of [".env", ".env.development", ".env.local", ".env.development.local"]) {
      try { env = { ...env, ...parse(await readText(resolve(rootPath, name), "utf8")) }; }
      catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") throw new Error("qstash_status_unavailable");
      }
    }
    env = { ...env, ...(options.environment ?? process.env) };
    const result = await verifyQstashConnection(env, options.fetchImpl);
    write(`${JSON.stringify(result)}\n`);
    return result;
  } catch {
    const result = { region: null, status: "unavailable", configured: false, missing: [] };
    write(`${JSON.stringify(result)}\n`);
    return result;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await qstashStatusMain();
  process.exitCode = result.status === "verified" ? 0 : 1;
}
