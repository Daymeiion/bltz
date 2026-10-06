// @vitest-environment node
import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mock.lookup }));
vi.mock("node:https", () => ({ request: mock.request }));
import { fetchArticleMetadata } from "@/lib/enrichment/safe-fetch";
const signal = () => AbortSignal.timeout(1000);
function response(status: number, headers: Record<string, string>, body = "<title>News</title>") {
  mock.request.mockImplementationOnce((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void };
    req.end = () => queueMicrotask(() => {
      const res = Object.assign(new EventEmitter(), { statusCode: status, headers, destroy: vi.fn() });
      callback(res); res.emit("data", Buffer.from(body)); res.emit("end");
    });
    return req;
  });
}
beforeEach(() => { vi.resetAllMocks(); mock.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]); });
it("pins validated DNS while retaining the original TLS hostname", async () => {
  response(200, { "content-type": "text/html; charset=UTF-8" });
  const article = await fetchArticleMetadata("https://publisher.example.com/story", signal());
  expect(article).toMatchObject({ article_url: "https://publisher.example.com/story", headline: "News" });
  expect(article).not.toHaveProperty("html");
  const [url, options] = mock.request.mock.calls[0]; expect(url.hostname).toBe("publisher.example.com"); expect(options.family).toBe(4);
  const callback = vi.fn(); options.lookup("publisher.example.com", {}, callback); expect(callback).toHaveBeenCalledWith(null, "8.8.8.8", 4);
});
it("rejects any private DNS result before issuing a request", async () => {
  mock.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }]);
  await expect(fetchArticleMetadata("https://publisher.example.com/story", signal())).rejects.toThrow("unsafe_destination"); expect(mock.request).not.toHaveBeenCalled();
});
it("validates redirect DNS and blocks redirects to local services", async () => {
  response(302, { location: "https://private.example.com/admin" });
  mock.lookup.mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }]).mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
  await expect(fetchArticleMetadata("https://publisher.example.com/story", signal())).rejects.toThrow("unsafe_destination"); expect(mock.request).toHaveBeenCalledTimes(1);
});
it("bounds body size and rejects non-HTML responses", async () => {
  response(200, { "content-type": "text/html" }, "x".repeat(1_500_001));
  await expect(fetchArticleMetadata("https://publisher.example.com/story", signal())).rejects.toThrow("metadata_too_large");
  response(200, { "content-type": "application/pdf" });
  await expect(fetchArticleMetadata("https://publisher.example.com/story", signal())).rejects.toThrow("metadata_blocked");
});
it("honors cancellation even while DNS is unresolved", async () => {
  mock.lookup.mockReturnValue(new Promise(() => {}));
  const controller = new AbortController();
  const pending = fetchArticleMetadata("https://publisher.example.com/story", controller.signal);
  controller.abort(); await expect(pending).rejects.toThrow("metadata_timeout");
});
it("denies a reference-only source before DNS or HTTP", async () => {
  await expect(fetchArticleMetadata("https://www.pro-football-reference.com/players/H/HughDa20.htm", signal())).rejects.toThrow("source_policy_blocked");
  expect(mock.lookup).not.toHaveBeenCalled(); expect(mock.request).not.toHaveBeenCalled();
});
it("rechecks source permission on every redirected destination before DNS", async () => {
  response(302, { location: "https://www.sports-reference.com/cfb/players/fixture-1.html" });
  await expect(fetchArticleMetadata("https://publisher.example.com/story", signal())).rejects.toThrow("source_policy_blocked");
  expect(mock.lookup).toHaveBeenCalledTimes(1); expect(mock.request).toHaveBeenCalledTimes(1);
});
