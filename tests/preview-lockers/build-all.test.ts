import { expect, it } from "vitest";
import { awardsOutcome, failedRetryable, initialBuildStatus, newsProblem, skipRemaining } from "@/lib/preview-lockers/build-all";

it("skips only unfinished tasks", () => {
  const status = { ...initialBuildStatus(), career: { state: "done" as const, detail: "ok" }, save: { state: "running" as const, detail: "…" } };
  const stopped = skipRemaining(status, "Cancelled.");
  expect(stopped.career.state).toBe("done");
  expect(stopped.save).toEqual({ state: "skipped", detail: "Cancelled." });
  expect(stopped.combine.state).toBe("skipped");
});

it("retries only failed saved-revision searches", () => {
  const status = { ...initialBuildStatus(), news: { state: "failed" as const, detail: "" }, combine: { state: "failed" as const, detail: "" }, career: { state: "failed" as const, detail: "" } };
  expect(failedRetryable(status)).toEqual(["news", "combine"]);
  expect(failedRetryable(null)).toEqual([]);
});

it("explains save-time news results", () => {
  expect(newsProblem(undefined).fatal).toBe(true);
  expect(newsProblem({ errors: ["news_rate_limited"], news_status: "unavailable" })).toMatchObject({ fatal: true, message: expect.stringContaining("cooling down") });
  expect(newsProblem({ errors: ["awards_unavailable"], news_status: "complete" })).toEqual({ fatal: false, message: "" });
  expect(newsProblem({ errors: ["search_timeout"], news_status: "partial" })).toMatchObject({ fatal: false, message: expect.stringContaining("timed out") });
});

it("summarizes award mapping from the save", () => {
  const attempt = { status: "complete" as const, awards_discovered: 3, awards_normalized: 2, unmapped_awards: ["Local"], errors: [], updated_at: "", source_revision: 2 };
  expect(awardsOutcome({ last_awards_attempt: attempt } as never)).toMatchObject({ ok: true, detail: "2 mapped to the award library, 1 need manual review." });
  expect(awardsOutcome({ status: "unavailable", errors: ["enrichment_unavailable"] }).ok).toBe(false);
});
