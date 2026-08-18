import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve("app/auth/admin/page.tsx"), "utf8");

describe("admin login responsive shell", () => {
  it("subtracts the persistent 56px navigation from the viewport height", () => {
    expect(page).toContain("min-h-[calc(100svh-3.5rem)]");
    expect(page).not.toContain('className="flex min-h-svh items-center');
  });

  it("keeps description text clear of the CardHeader border", () => {
    expect(page).toContain('CardHeader className="border-b border-neutral-800 pb-6"');
  });
});
