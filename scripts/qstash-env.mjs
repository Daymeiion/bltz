import { randomBytes, timingSafeEqual } from "node:crypto";
import { parse } from "dotenv";

const REGIONS = {
  us: { region: "us-east-1", url: "https://qstash-us-east-1.upstash.io" },
  eu: { region: "eu-central-1", url: "https://qstash-eu-central-1.upstash.io" },
};
const TARGETS = ["QSTASH_URL", "QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY",
  "BLTZ_ANALYTICS_DISPATCH_SECRET", "BLTZ_ANALYTICS_PIPELINE_ENABLED", "BLTZ_ANALYTICS_ENVIRONMENT"];
const CREDENTIAL_NAMES = ["QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY"];
const MAX_RESPONSE_BYTES = 16_384;
const TIMEOUT_MS = 15_000;

/** @typedef {{token: string, region: string, signing_keys: {current: string, next: string}}} QstashCredentials */
/** @typedef {{region: 'us-east-1'|'eu-central-1'|null, status: 'verified'|'unconfigured'|'unavailable'|'mismatch', configured: boolean, missing: string[]}} QstashStatus */

function invalid() { return new Error("qstash_setup_invalid_configuration"); }
function conflict() { return new Error("qstash_setup_existing_configuration_conflict"); }

/** No shell interpolation, dotenv expansion, control characters or multiline values.
 * @param {unknown} value
 * @param {number} [minimum]
 */
function safeCredential(value, minimum = 1) {
  return typeof value === "string" && value.length >= minimum && value.length <= 8192
    && /^[A-Za-z0-9._~+/=:-]+$/.test(value);
}

/** @param {unknown} input */
function selectedRegion(input) {
  if (input === "us" || input === "us-east-1") return REGIONS.us;
  if (input === "eu" || input === "eu-central-1") return REGIONS.eu;
  throw invalid();
}

/** Only documented regional origins; the legacy/default origin is EU.
 * @param {unknown} value
 */
function endpointRegion(value) {
  if (typeof value !== "string" || !value || value !== value.trim()) throw invalid();
  let url;
  try { url = new URL(value); } catch { throw invalid(); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw invalid();
  if ([REGIONS.eu.url, "https://qstash.upstash.io"].includes(url.origin)) return REGIONS.eu;
  if (url.origin === REGIONS.us.url) return REGIONS.us;
  throw invalid();
}

/** @param {string} text @param {string} quote @param {number} start */
function closingQuote(text, quote, start) {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "\\" && text[index + 1] === quote) { index += 1; continue; }
    if (text[index] === quote) return index;
  }
  return -1;
}

/** Scan declarations without mistaking lines inside unrelated multiline values for keys.
 * @param {string} text
 */
function declarations(text) {
  const lines = text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g)?.filter(Boolean) ?? [];
  /** @type {Map<number, {name:string, value:string, prefix:string, suffix:string, end:string, bom:string}>} */
  const found = new Map();
  let multilineQuote = "";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const end = line.match(/(?:\r\n|\n|\r)$/)?.[0] ?? "";
    const body = end ? line.slice(0, -end.length) : line;
    if (multilineQuote) {
      if (closingQuote(body, multilineQuote, 0) >= 0) multilineQuote = "";
      continue;
    }
    const bom = index === 0 && body.startsWith("\uFEFF") ? "\uFEFF" : "";
    const content = bom ? body.slice(1) : body;
    // Dotenv accepts dots, hyphens and numeric starts in unrelated key names.
    // Its colon assignment form must also participate in multiline scanning.
    const assignment = content.match(/^([ \t]*(?:export[ \t]+)?([\w.-]+)([ \t]*=[ \t]*|:[ \t]+))(.*)$/);
    if (!assignment) {
      if (TARGETS.some(name => new RegExp(`^\\s*(?:export\\s+)?${name}(?:\\s|[:=]|$)`).test(content))) throw invalid();
      continue;
    }
    const [, prefix, name, separator, rawValue] = assignment;
    const quoted = ["\"", "'", "`"].includes(rawValue[0]);
    const close = quoted ? closingQuote(rawValue, rawValue[0], 1) : -1;
    if (!TARGETS.includes(name)) {
      if (quoted && close < 0) multilineQuote = rawValue[0];
      continue;
    }
    if (separator.startsWith(":")) throw invalid();
    if (quoted && (close < 0 || !/^[ \t]*(?:#.*)?$/.test(rawValue.slice(close + 1)))) throw invalid();
    const value = parse(content)[name];
    if (typeof value !== "string") throw invalid();
    const valueEnd = quoted ? close + 1 : rawValue.indexOf("#") < 0 ? rawValue.length : rawValue.indexOf("#");
    const trailingSpace = rawValue.slice(0, valueEnd).match(/[ \t]*$/)?.[0] ?? "";
    const suffix = trailingSpace + rawValue.slice(valueEnd);
    found.set(index, { name, value, prefix, suffix, end, bom });
  }
  // Appending into an unclosed unrelated quote could silently swallow new settings.
  if (multilineQuote) throw invalid();
  return { lines, found };
}

/** Plan an atomic local update. Does not read files, print values, enable delivery or call APIs.
 * Different populated secrets, regional settings and enabled gates require explicit disposition.
 * @param {string} originalText
 * @param {QstashCredentials} credentials
 * @param {string} [region]
 * @returns {{updatedText:string, changedNames:string[]}}
 */
export function planQstashEnv(originalText, credentials, region = "us") {
  if (typeof originalText !== "string" || originalText.length > 1_048_576 || originalText.includes("\0")) throw invalid();
  const selected = selectedRegion(region);
  if (!credentials || credentials.region !== selected.region || !safeCredential(credentials.token)
    || !safeCredential(credentials.signing_keys?.current) || !safeCredential(credentials.signing_keys?.next)
    || credentials.signing_keys.current === credentials.signing_keys.next) throw invalid();
  const scanned = declarations(originalText);
  /** @type {Record<string,string>} */
  const desired = { QSTASH_URL: selected.url, QSTASH_TOKEN: credentials.token,
    QSTASH_CURRENT_SIGNING_KEY: credentials.signing_keys.current, QSTASH_NEXT_SIGNING_KEY: credentials.signing_keys.next,
    BLTZ_ANALYTICS_PIPELINE_ENABLED: "false", BLTZ_ANALYTICS_ENVIRONMENT: "development" };
  for (const { name, value } of scanned.found.values()) {
    if (!value.trim()) continue;
    if (name === "BLTZ_ANALYTICS_DISPATCH_SECRET") {
      if (!safeCredential(value, 32)) throw invalid();
      if (desired[name] && desired[name] !== value) throw conflict();
      desired[name] = value;
    } else if (name === "QSTASH_URL") {
      if (endpointRegion(value).region !== selected.region) throw conflict();
      // Preserve an equivalent existing EU alias or trailing slash rather than rewrite it.
      desired[name] = value;
    } else if (value !== desired[name]) throw conflict();
  }
  desired.BLTZ_ANALYTICS_DISPATCH_SECRET ??= randomBytes(32).toString("base64url");
  const newline = originalText.match(/\r\n|\n|\r/)?.[0] ?? "\n";
  const seen = new Set();
  const changed = new Set();
  const output = scanned.lines.map((line, index) => {
    const declaration = scanned.found.get(index);
    if (!declaration) return line;
    const { name, value, prefix, suffix, end, bom } = declaration;
    if (seen.has(name)) { changed.add(name); return ""; }
    seen.add(name);
    if (value === desired[name]) return line;
    changed.add(name);
    return `${bom}${prefix}${JSON.stringify(desired[name])}${suffix}${end}`;
  }).join("");
  let updatedText = output;
  for (const name of TARGETS) {
    if (seen.has(name)) continue;
    if (updatedText && !/[\r\n]$/.test(updatedText)) updatedText += newline;
    updatedText += `${name}=${JSON.stringify(desired[name])}${newline}`;
    changed.add(name);
  }
  // The final document must agree with the actual dotenv parser, including multiline values.
  // Never return a plan whose apparently valid declarations are swallowed or overridden.
  const originalValues = parse(originalText);
  const evaluated = parse(updatedText);
  if (TARGETS.some(name => evaluated[name] !== desired[name])) throw invalid();
  const allNames = new Set([...Object.keys(originalValues), ...Object.keys(evaluated)]);
  if ([...allNames].some(name => !TARGETS.includes(name) && originalValues[name] !== evaluated[name])) throw invalid();
  return { updatedText, changedNames: TARGETS.filter(name => changed.has(name)) };
}

/** @param {Response} response */
async function boundedJson(response) {
  const advertised = response.headers.get("content-length");
  if (advertised && /^\d+$/.test(advertised) && Number(advertised) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw invalid();
  }
  if (!response.body) throw invalid();
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw invalid();
      chunks.push(chunk.value);
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Read-only credential/key-pair verification. Never publish, rotate, log responses or expose keys.
 * Configured means these connection credentials are present, not that the analytics pipeline is ready.
 * @param {Record<string,string|undefined>} env
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<QstashStatus>}
 */
export async function verifyQstashConnection(env, fetchImpl = fetch) {
  const missing = CREDENTIAL_NAMES.filter(name => !safeCredential(env[name]));
  let selected;
  try { selected = endpointRegion(env.QSTASH_URL ?? "https://qstash.upstash.io"); }
  catch { return { region: null, status: "unconfigured", configured: false, missing: [...missing, "QSTASH_URL"] }; }
  const region = /** @type {'us-east-1'|'eu-central-1'} */ (selected.region);
  if (missing.length) return { region, status: "unconfigured", configured: false, missing };
  const metadata = { region, configured: true, missing: [] };
  const controller = new AbortController();
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(invalid()); }, TIMEOUT_MS);
  });
  try {
    const operation = (async () => {
      const response = await fetchImpl(`${selected.url}/v2/keys`, { method: "GET", redirect: "error", cache: "no-store",
        signal: controller.signal, headers: { Authorization: `Bearer ${env.QSTASH_TOKEN}`, Accept: "application/json" } });
      if (!response.ok) { await response.body?.cancel().catch(() => {}); throw invalid(); }
      const actual = await boundedJson(response);
      if (!safeCredential(actual?.current) || !safeCredential(actual?.next)) throw invalid();
      const same = (/** @type {string} */ a, /** @type {string} */ b) => {
        const first = Buffer.from(a), second = Buffer.from(b);
        return first.length === second.length && timingSafeEqual(first, second);
      };
      return same(actual.current, /** @type {string} */ (env.QSTASH_CURRENT_SIGNING_KEY))
        && same(actual.next, /** @type {string} */ (env.QSTASH_NEXT_SIGNING_KEY));
    })();
    return { ...metadata, status: await Promise.race([operation, deadline]) ? "verified" : "mismatch" };
  } catch { return { ...metadata, status: "unavailable" }; }
  finally { clearTimeout(timer); controller.abort(); }
}
