// @vitest-environment node
import { basename } from "node:path";
import { parse } from "dotenv";
import { afterEach, describe, expect, it, vi } from "vitest";
import { planQstashEnv, verifyQstashConnection } from "../../scripts/qstash-env.mjs";
import { qstashStatusMain } from "../../scripts/qstash-status.mjs";

const credentials = {
  token: "synthetic-qstash-token-us",
  region: "us-east-1",
  signing_keys: { current: "sig_synthetic_current_us", next: "sig_synthetic_next_us" },
};
const dispatchSecret = "synthetic-existing-dispatch-secret-0123456789";
const configured = {
  QSTASH_URL: "https://qstash-us-east-1.upstash.io",
  QSTASH_TOKEN: credentials.token,
  QSTASH_CURRENT_SIGNING_KEY: credentials.signing_keys.current,
  QSTASH_NEXT_SIGNING_KEY: credentials.signing_keys.next,
};
const invalid = "qstash_setup_invalid_configuration";
const conflict = "qstash_setup_existing_configuration_conflict";
const keyResponse = () => Response.json({ ...credentials.signing_keys, token: "synthetic-private-upstream-field" });
const requestFetcher = () => vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => keyResponse());
const safeMetadataKeys = ["configured", "missing", "region", "status"];

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("QStash local configuration planning", () => {
  it("stages one explicit US credential triple and keeps the pipeline disabled", () => {
    const result = planQstashEnv("", credentials);
    const values = parse(result.updatedText);
    expect(values).toMatchObject({ ...configured, BLTZ_ANALYTICS_PIPELINE_ENABLED: "false", BLTZ_ANALYTICS_ENVIRONMENT: "development" });
    expect(values.BLTZ_ANALYTICS_DISPATCH_SECRET).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.changedNames).toEqual([
      "QSTASH_URL", "QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY",
      "BLTZ_ANALYTICS_DISPATCH_SECRET", "BLTZ_ANALYTICS_PIPELINE_ENABLED", "BLTZ_ANALYTICS_ENVIRONMENT",
    ]);
  });

  it("preserves unrelated bytes, BOM, CRLF, comments and an existing private dispatch secret", () => {
    const original = "\uFEFF# Existing configuration\r\nUNRELATED_SECRET='synthetic-private-value'  # untouched\r\n"
      + "  export QSTASH_TOKEN =  # fill this\r\n"
      + `BLTZ_ANALYTICS_DISPATCH_SECRET='${dispatchSecret}' # keep this\r\n`
      + "TAIL=unchanged";
    const result = planQstashEnv(original, credentials);
    expect(result.updatedText.startsWith("\uFEFF# Existing configuration\r\nUNRELATED_SECRET='synthetic-private-value'  # untouched\r\n")).toBe(true);
    expect(result.updatedText).toContain(`  export QSTASH_TOKEN =  "${credentials.token}"# fill this\r\n`);
    expect(result.updatedText).toContain(`BLTZ_ANALYTICS_DISPATCH_SECRET='${dispatchSecret}' # keep this\r\n`);
    expect(result.updatedText).toContain("TAIL=unchanged\r\n");
    expect(result.updatedText.replace(/\r\n/g, "")).not.toContain("\n");
    expect(result.changedNames).not.toContain("BLTZ_ANALYTICS_DISPATCH_SECRET");
    expect(parse(result.updatedText).BLTZ_ANALYTICS_DISPATCH_SECRET).toBe(dispatchSecret);
  });

  it("is exactly idempotent when given the same fetched credentials", () => {
    const first = planQstashEnv("UNRELATED=keep\n", credentials);
    const second = planQstashEnv(first.updatedText, credentials);
    expect(second).toEqual({ updatedText: first.updatedText, changedNames: [] });
  });

  it("removes overriding duplicate target declarations, preserving unrelated duplicate keys", () => {
    const original = `QSTASH_TOKEN='${credentials.token}' # first\nQSTASH_TOKEN=\nexport QSTASH_TOKEN=${credentials.token}\n`
      + `BLTZ_ANALYTICS_DISPATCH_SECRET=${dispatchSecret}\nBLTZ_ANALYTICS_DISPATCH_SECRET=\n`
      + "UNRELATED=one\nUNRELATED=two\n";
    const result = planQstashEnv(original, credentials);
    expect(result.updatedText.match(/^(?:export )?QSTASH_TOKEN=/gm)).toHaveLength(1);
    expect(result.updatedText.match(/^BLTZ_ANALYTICS_DISPATCH_SECRET=/gm)).toHaveLength(1);
    expect(result.updatedText).toContain("UNRELATED=one\nUNRELATED=two\n");
    expect(result.changedNames).toContain("QSTASH_TOKEN");
    expect(planQstashEnv(result.updatedText, credentials).changedNames).toEqual([]);
  });

  it.each([
    ["QSTASH_TOKEN", "synthetic-other-token"],
    ["QSTASH_CURRENT_SIGNING_KEY", "sig_other_current"],
    ["QSTASH_NEXT_SIGNING_KEY", "sig_other_next"],
    ["BLTZ_ANALYTICS_PIPELINE_ENABLED", "true"],
    ["BLTZ_ANALYTICS_ENVIRONMENT", "production"],
    ["QSTASH_URL", "https://qstash-eu-central-1.upstash.io"],
  ])("refuses a populated conflicting %s without revealing its value", (name, value) => {
    try { planQstashEnv(`${name}=${value}\n`, credentials); throw new Error("should reject"); }
    catch (error) { expect((error as Error).message).toBe(conflict); expect(String(error)).not.toContain(value); }
  });

  it("refuses hidden conflicting duplicates instead of trusting only the last dotenv value", () => {
    expect(() => planQstashEnv(`QSTASH_TOKEN=synthetic-other-token\nQSTASH_TOKEN=${credentials.token}\n`, credentials)).toThrow(conflict);
    expect(() => planQstashEnv(`BLTZ_ANALYTICS_DISPATCH_SECRET=${dispatchSecret}\nBLTZ_ANALYTICS_DISPATCH_SECRET=${"other-".repeat(8)}\n`, credentials)).toThrow(conflict);
  });

  it("supports explicitly selected EU credentials and preserves the documented legacy EU alias", () => {
    const eu = { ...credentials, region: "eu-central-1" };
    const result = planQstashEnv("QSTASH_URL=https://qstash.upstash.io/ # EU alias\n", eu, "eu");
    expect(result.updatedText).toContain("QSTASH_URL=https://qstash.upstash.io/ # EU alias\n");
    expect(parse(result.updatedText).QSTASH_URL).toBe("https://qstash.upstash.io/");
    expect(parse(planQstashEnv("", eu, "eu-central-1").updatedText).QSTASH_URL).toBe("https://qstash-eu-central-1.upstash.io");
    expect(() => planQstashEnv("", eu)).toThrow(invalid);
  });

  it.each(["ap-southeast-1", "", "US", "https://qstash-us-east-1.upstash.io"])("rejects unsupported region selection %s", region => {
    expect(() => planQstashEnv("", credentials, region)).toThrow(invalid);
  });

  it.each(["secret\nQSTASH_URL=http://untrusted.invalid", "secret\rvalue", "secret$EXPANSION", "secret`command`", "secret#suffix", "secret with spaces", ""])("rejects unsafe fetched credential values", token => {
    expect(() => planQstashEnv("", { ...credentials, token })).toThrow(invalid);
  });

  it("requires both distinct signing keys and the selected credential region", () => {
    expect(() => planQstashEnv("", { ...credentials, region: "eu-central-1" })).toThrow(invalid);
    expect(() => planQstashEnv("", { ...credentials, signing_keys: { current: "same-key", next: "same-key" } })).toThrow(invalid);
    expect(() => planQstashEnv("", { ...credentials, signing_keys: { current: "", next: "next-key" } })).toThrow(invalid);
    expect(() => planQstashEnv("", { ...credentials, signing_keys: undefined } as unknown as typeof credentials)).toThrow(invalid);
  });

  it.each([
    "QSTASH_TOKEN: synthetic-value\n", "export QSTASH_TOKEN synthetic-value\n", "QSTASH_TOKEN\n",
    "QSTASH_TOKEN='unterminated\n", "QSTASH_TOKEN='value' trailing-data\n",
    "QSTASH_TOKEN=\"line1\nline2\"\n", "BLTZ_ANALYTICS_DISPATCH_SECRET=short\n",
    "QSTASH_URL=https://qstash-us-east-1.upstash.io?token=synthetic-secret\n",
  ])("rejects malformed or unsafe dotenv target declarations", original => {
    expect(() => planQstashEnv(original, credentials)).toThrow(invalid);
  });

  it("preserves valid unrelated multiline values and never interprets their contents as target declarations", () => {
    const original = "# QSTASH_TOKEN=comment-only\nUNRELATED=\"line one\nQSTASH_TOKEN=inside-multiline-value\nline three\"\n";
    const result = planQstashEnv(original, credentials);
    expect(result.updatedText.startsWith(original)).toBe(true);
    expect(parse(result.updatedText).UNRELATED).toBe("line one\nQSTASH_TOKEN=inside-multiline-value\nline three");
    expect(parse(result.updatedText).QSTASH_TOKEN).toBe(credentials.token);
    expect(() => planQstashEnv("UNRELATED='unclosed\n", credentials)).toThrow(invalid);
  });

  it("does not mistake escaped quotes inside unrelated multiline values for the end of the value", () => {
    const original = "UNRELATED='line one\\'\nQSTASH_TOKEN=inside-value\nline three'\n";
    const result = planQstashEnv(original, credentials);
    expect(result.updatedText.startsWith(original)).toBe(true);
    expect(parse(result.updatedText).QSTASH_TOKEN).toBe(credentials.token);
  });

  it.each(["OTHER.KEY", "OTHER-KEY", "123KEY"])("preserves multiline values for dotenv key %s", name => {
    const original = `${name}=\"first line\nBLTZ_ANALYTICS_PIPELINE_ENABLED=\nlast line\"\n`;
    const result = planQstashEnv(original, credentials);
    expect(result.updatedText.startsWith(original)).toBe(true);
    expect(parse(result.updatedText)[name]).toBe("first line\nBLTZ_ANALYTICS_PIPELINE_ENABLED=\nlast line");
    expect(parse(result.updatedText).BLTZ_ANALYTICS_PIPELINE_ENABLED).toBe("false");
  });

  it("preserves unrelated multiline values using dotenv colon assignment", () => {
    const original = "OTHER.KEY: 'first line\nQSTASH_TOKEN=\nlast line'\n";
    const result = planQstashEnv(original, credentials);
    expect(result.updatedText.startsWith(original)).toBe(true);
    expect(parse(result.updatedText).QSTASH_TOKEN).toBe(credentials.token);
  });
});

describe("read-only, redacted QStash credential verification", () => {
  it("does no network work without a credential triple, and identifies the default endpoint as EU", async () => {
    const fetcher = requestFetcher();
    expect(await verifyQstashConnection({}, fetcher)).toEqual({ region: "eu-central-1", status: "unconfigured", configured: false,
      missing: ["QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY"] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses GET /v2/keys only, refuses redirects and returns metadata without any upstream fields", async () => {
    const fetcher = requestFetcher();
    const result = await verifyQstashConnection(configured, fetcher);
    expect(result).toEqual({ region: "us-east-1", status: "verified", configured: true, missing: [] });
    expect(Object.keys(result).sort()).toEqual(safeMetadataKeys);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe("https://qstash-us-east-1.upstash.io/v2/keys");
    expect(request).toMatchObject({ method: "GET", redirect: "error", cache: "no-store", headers: { Authorization: `Bearer ${credentials.token}`, Accept: "application/json" } });
    expect(request?.body).toBeUndefined();
    expect(request?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.stringify(result)).not.toMatch(/synthetic|sig_|token/);
  });

  it("routes legacy and explicit EU URLs to the documented EU origin", async () => {
    for (const url of [undefined, "https://qstash.upstash.io/", "https://qstash-eu-central-1.upstash.io"]) {
      const fetcher = requestFetcher();
      const result = await verifyQstashConnection({ ...configured, QSTASH_URL: url }, fetcher);
      expect(result.region).toBe("eu-central-1");
      expect(fetcher.mock.calls[0][0]).toBe("https://qstash-eu-central-1.upstash.io/v2/keys");
    }
  });

  it.each([
    "http://qstash-us-east-1.upstash.io", "https://user:synthetic-secret@qstash-us-east-1.upstash.io",
    "https://qstash-us-east-1.upstash.io?secret=synthetic-secret", "https://qstash-us-east-1.upstash.io#fragment",
    "https://untrusted.invalid", "https://qstash-us-east-1.upstash.io/v2/publish", "",
  ])("never sends credentials to an invalid endpoint %s", async url => {
    const fetcher = requestFetcher();
    const result = await verifyQstashConnection({ ...configured, QSTASH_URL: url }, fetcher);
    expect(result).toEqual({ region: null, status: "unconfigured", configured: false, missing: ["QSTASH_URL"] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("compares both actual signing keys, including their order", async () => {
    for (const pair of [
      { ...credentials.signing_keys, next: "sig_other_next" },
      { current: credentials.signing_keys.next, next: credentials.signing_keys.current },
    ]) {
      const result = await verifyQstashConnection(configured, async () => Response.json(pair));
      expect(result.status).toBe("mismatch");
      expect(JSON.stringify(result)).not.toContain("sig_");
    }
  });

  it.each([401, 403, 307, 500])("redacts HTTP %s response bodies and headers", async status => {
    const result = await verifyQstashConnection(configured, async () => new Response("synthetic-private-upstream-error", { status,
      headers: { "x-private": "synthetic-private-header" } }));
    expect(result).toEqual({ region: "us-east-1", status: "unavailable", configured: true, missing: [] });
    expect(JSON.stringify(result)).not.toContain("synthetic");
  });

  it("redacts thrown transport errors, malformed JSON and malformed upstream key data", async () => {
    const fetchers: typeof fetch[] = [
      async () => { throw new Error(`upstream disclosed ${credentials.token}`); },
      async () => new Response("synthetic-sensitive-not-json"),
      async () => Response.json({ current: "unsafe\nkey", next: "next" }),
      async () => new Response(new Uint8Array([0xff, 0xfe])),
    ];
    for (const fetcher of fetchers) {
      const result = await verifyQstashConnection(configured, fetcher);
      expect(result.status).toBe("unavailable");
      expect(JSON.stringify(result)).not.toMatch(/synthetic|upstream|unsafe/);
    }
  });

  it("rejects an oversized advertised body before reading and cancels the stream", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    const result = await verifyQstashConnection(configured, async () => new Response(body, { headers: { "content-length": "16385" } }));
    expect(result.status).toBe("unavailable");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("enforces the actual streamed 16 KiB cap even with a deceptive content length", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(16_385))); }, cancel });
    const result = await verifyQstashConnection(configured, async () => new Response(body, { headers: { "content-length": "1" } }));
    expect(result.status).toBe("unavailable");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("bounds a fetch that ignores cancellation to 15 seconds, aborting without leaking its error", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: RequestInfo | URL, _request?: RequestInit) => new Promise<Response>(() => {}));
    const pending = verifyQstashConnection(configured, fetcher);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({ status: "unavailable", configured: true });
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds a body that stalls after the response headers and clears its deadline on success", async () => {
    vi.useFakeTimers();
    let bodyController!: ReadableStreamDefaultController;
    const body = new ReadableStream({ start(controller) { bodyController = controller; } });
    const pending = verifyQstashConnection(configured, async () => new Response(body));
    await vi.advanceTimersByTimeAsync(15_000);
    expect((await pending).status).toBe("unavailable");
    expect(vi.getTimerCount()).toBe(0);
    bodyController.close();
    await Promise.resolve();
    expect((await verifyQstashConnection(configured, requestFetcher())).status).toBe("verified");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("QStash status CLI private dotenv loading", () => {
  function absentFile(): Promise<string> { return Promise.reject(Object.assign(new Error("synthetic-private-path"), { code: "ENOENT" })); }

  it("reads local dotenv privately, respects precedence and writes only redacted status JSON", async () => {
    const files: Record<string, string> = {
      ".env": "UNRELATED_SECRET=synthetic-private-unrelated\nQSTASH_URL=https://qstash.upstash.io\n",
      ".env.development": "QSTASH_URL=https://qstash-eu-central-1.upstash.io\n",
      ".env.local": `QSTASH_TOKEN=${credentials.token}\nQSTASH_CURRENT_SIGNING_KEY=${credentials.signing_keys.current}\nQSTASH_NEXT_SIGNING_KEY=${credentials.signing_keys.next}\n`,
      ".env.development.local": "QSTASH_URL=https://qstash-us-east-1.upstash.io\n",
    };
    const readFileImpl = vi.fn(async (path: string, encoding: "utf8") => { expect(encoding).toBe("utf8"); return files[basename(path)] ?? absentFile(); });
    const write = vi.fn(); const fetcher = requestFetcher();
    const result = await qstashStatusMain({ rootPath: "C:/synthetic-only", environment: {}, readFileImpl, fetchImpl: fetcher, write });
    expect(result.status).toBe("verified");
    expect(readFileImpl.mock.calls.map(([path]) => basename(path))).toEqual([".env", ".env.development", ".env.local", ".env.development.local"]);
    expect(write).toHaveBeenCalledExactlyOnceWith(`${JSON.stringify(result)}\n`);
    expect(write.mock.calls[0][0]).not.toMatch(/synthetic|sig_|Bearer|TOKEN/);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
  });

  it("uses an explicit process environment override without modifying any dotenv file", async () => {
    const fetcher = requestFetcher(); const write = vi.fn();
    const result = await qstashStatusMain({ rootPath: "C:/synthetic-only", readFileImpl: async () => "QSTASH_URL=https://qstash.upstash.io\n",
      environment: configured, fetchImpl: fetcher, write });
    expect(result.region).toBe("us-east-1");
    expect(fetcher.mock.calls[0][0]).toBe("https://qstash-us-east-1.upstash.io/v2/keys");
  });

  it("handles absent dotenv files without fetching or creating settings", async () => {
    const fetcher = requestFetcher(); const write = vi.fn();
    const result = await qstashStatusMain({ environment: {}, readFileImpl: absentFile, fetchImpl: fetcher, write });
    expect(result.status).toBe("unconfigured"); expect(result.configured).toBe(false);
    expect(fetcher).not.toHaveBeenCalled(); expect(write).toHaveBeenCalledOnce();
  });

  it("suppresses filesystem error details and does not perform a network call after a read failure", async () => {
    const fetcher = requestFetcher(); const write = vi.fn();
    const result = await qstashStatusMain({ environment: configured, readFileImpl: async () => { throw new Error(`private file contains ${credentials.token}`); }, fetchImpl: fetcher, write });
    expect(result).toEqual({ region: null, status: "unavailable", configured: false, missing: [] });
    expect(fetcher).not.toHaveBeenCalled();
    expect(write.mock.calls[0][0]).not.toContain(credentials.token);
  });
});
